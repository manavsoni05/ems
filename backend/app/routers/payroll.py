import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.dependencies.auth import get_current_employee, require_role, require_permission
from app.models.payroll import PayrollInDB, PayrollGenerate, PayrollUpdate
from datetime import datetime # Make sure datetime is imported

router = APIRouter(
    tags=["Payroll"],
    redirect_slashes=False
)

db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
collection = db.payroll

@router.post("/generate", status_code=status.HTTP_201_CREATED, response_model=PayrollInDB, dependencies=[Depends(require_permission("payroll:create"))])
async def generate_payroll(payroll_in: PayrollGenerate):
    """
    Generates a new payroll record for an employee.
    Calculates net salary based on gross and deductions.
    Stores dates as datetime objects at the start of the day.
    """
    net_salary = payroll_in.gross_salary - payroll_in.deductions
    if net_salary < 0:
        raise HTTPException(status_code=400, detail="Net salary cannot be negative.")

    payroll_doc = payroll_in.model_dump()
    payroll_doc["payroll_id"] = f"PAY-{uuid.uuid4().hex[:8].upper()}"
    payroll_doc["net_salary"] = net_salary
    payroll_doc["status"] = "Generated" # Default status
    payroll_doc["is_deleted"] = False # <-- ADD THIS

    # Convert date objects to datetime objects at midnight UTC before saving
    payroll_doc["pay_period_start"] = datetime.combine(payroll_in.pay_period_start, datetime.min.time())
    payroll_doc["pay_period_end"] = datetime.combine(payroll_in.pay_period_end, datetime.min.time())

    await collection.insert_one(payroll_doc)
    # Fetch the newly created document to ensure it's returned correctly
    created_payroll = await collection.find_one({"payroll_id": payroll_doc["payroll_id"]})
    if not created_payroll:
         raise HTTPException(status_code=500, detail="Failed to retrieve created payroll record.")
    return created_payroll

@router.get("", response_model=List[Dict[str, Any]], dependencies=[Depends(require_permission("payroll:read_all"))])
async def list_all_payroll():
    """
    Lists all payroll records, joining with employee details to include names.
    Uses an aggregation pipeline for efficient joining and projection.
    """
    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}}}, # <-- ADD FILTER
        {
            "$lookup": {
                "from": "employees",
                "localField": "employee_id",
                "foreignField": "employee_id",
                "as": "employee_details"
            }
        },
        {"$unwind": {"path": "$employee_details", "preserveNullAndEmptyArrays": True}},
        # Also filter out payroll for deleted employees
        {"$match": {"employee_details.is_deleted": {"$ne": True}}}, # <-- ADD FILTER
        {
            "$project": {
                "_id": 0, # Exclude the default MongoDB _id
                "payroll_id": 1,
                "employee_id": 1,
                # Use $ifNull to handle cases where employee might not be found
                "first_name": {"$ifNull": ["$employee_details.first_name", "N/A"]},
                "last_name": {"$ifNull": ["$employee_details.last_name", ""]},
                "pay_period_start": 1,
                "pay_period_end": 1,
                "gross_salary": 1,
                "deductions": 1,
                "net_salary": 1,
                "status": 1
            }
        },
        {"$sort": {"pay_period_end": -1, "last_name": 1}}
    ]
    records = await collection.aggregate(pipeline).to_list(1000) 
    return records

@router.get("/me", response_model=List[PayrollInDB], dependencies=[Depends(require_permission("payroll:read_self"))])
async def get_my_payroll(current_user: Dict[str, Any] = Depends(get_current_employee)):
    """
    Retrieves all payroll records for the currently authenticated employee.
    """
    records = await collection.find(
        {"employee_id": current_user["employee_id"], "is_deleted": {"$ne": True}} # <-- FILTER
    ).sort("pay_period_end", -1).to_list(1000) # Sort newest first
    return records

@router.put("/{payroll_id}", response_model=PayrollInDB, dependencies=[Depends(require_permission("payroll:update"))])
async def update_payroll(payroll_id: str, payroll_update: PayrollUpdate):
    """
    Updates an existing payroll record. Allows updating pay period dates,
    gross salary, deductions, and status. Recalculates net salary if
    gross or deductions change.
    """
    update_data = payroll_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    # Fetch existing record to calculate net_salary if needed and for validation
    existing_payroll = await collection.find_one(
        {"payroll_id": payroll_id, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not existing_payroll:
         raise HTTPException(status_code=404, detail="Payroll record not found")

    # Prepare data for the $set operation, converting dates to datetime
    update_set = {}
    if 'gross_salary' in update_data:
        update_set['gross_salary'] = update_data['gross_salary']
    if 'deductions' in update_data:
        update_set['deductions'] = update_data['deductions']
    if 'status' in update_data:
         update_set['status'] = update_data['status']
    if 'is_deleted' in update_data: # Handle soft delete
         update_set['is_deleted'] = update_data['is_deleted']

    # Convert incoming date objects to datetime objects before saving
    if 'pay_period_start' in update_data and update_data['pay_period_start']:
        update_set['pay_period_start'] = datetime.combine(update_data['pay_period_start'], datetime.min.time())
    if 'pay_period_end' in update_data and update_data['pay_period_end']:
        update_set['pay_period_end'] = datetime.combine(update_data['pay_period_end'], datetime.min.time())

    # Validate that start date is not after end date if both are provided
    final_start_date = update_set.get('pay_period_start', existing_payroll.get('pay_period_start'))
    final_end_date = update_set.get('pay_period_end', existing_payroll.get('pay_period_end'))
    if final_start_date and final_end_date and final_start_date > final_end_date:
        raise HTTPException(status_code=400, detail="Pay period start date cannot be after end date.")


    # Recalculate net_salary only if gross_salary or deductions are part of this update
    if 'gross_salary' in update_set or 'deductions' in update_set:
        new_gross = update_set.get('gross_salary', existing_payroll.get('gross_salary', 0))
        new_deductions = update_set.get('deductions', existing_payroll.get('deductions', 0))
        update_set['net_salary'] = new_gross - new_deductions
        if update_set['net_salary'] < 0:
            raise HTTPException(status_code=400, detail="Net salary cannot be negative based on the update.")

    if not update_set:
        raise HTTPException(status_code=400, detail="No valid fields provided for update.")

    # Perform the database update
    result = await collection.update_one(
        {"payroll_id": payroll_id},
        {"$set": update_set}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payroll record not found during update.")

    updated_payroll = await collection.find_one({"payroll_id": payroll_id})
    if not updated_payroll: 
        raise HTTPException(status_code=500, detail="Failed to retrieve updated payroll record.")

    return updated_payroll