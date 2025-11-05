# backend/app/routers/leaves.py
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.dependencies.auth import get_current_employee, require_role, require_permission
# Import the specific service functions
from app.services.leave_service import create_leave_request_service, update_leave_status_service
from app.models.leave import LeaveCreate, LeaveInDB, LeaveUpdate, LeaveStatusEnum, DailyBreakdownItem # Added DailyBreakdownItem
from datetime import datetime, timezone # Added timezone
# REMOVED: from app.services import notification_service

router = APIRouter(
    tags=["Leaves"],
    redirect_slashes=False
)

db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
collection = db.leaves # Keep for GET endpoints
employees_collection = db.employees # Keep for validation

@router.post("", status_code=status.HTTP_201_CREATED, response_model=LeaveInDB)
async def create_leave_request(
    leave_in: LeaveCreate,
    current_user: Dict[str, Any] = Depends(get_current_employee) # <-- Use get_current_employee
):
    # Permission logic is now inside the endpoint
    user_permissions = current_user.get("permissions", [])
    
    if leave_in.employee_id == current_user['employee_id']:
        if "leave:create_self" not in user_permissions and current_user['role_id'] != 'admin':
            raise HTTPException(status_code=403, detail="You do not have permission to request leave for yourself.")
    else:
        if "leave:create_all" not in user_permissions and current_user['role_id'] != 'admin':
            raise HTTPException(status_code=403, detail="You do not have permission to request leave for others.")

    if not leave_in.daily_breakdown:
        raise HTTPException(status_code=400, detail="Leave request must contain at least one day.")
    
    target_employee = await employees_collection.find_one({"employee_id": leave_in.employee_id})
    if not target_employee:
        raise HTTPException(status_code=404, detail=f"Employee with ID {leave_in.employee_id} not found.")
    # Extract dates and types for the service function (handle potential missing duration)
    # Assuming leave_in.daily_breakdown items are validated by Pydantic
    # We need start/end date logic here if service doesn't recalculate it,
    # but the service function now handles breakdown creation from start/end.
    # For this router, we pass the raw validated breakdown.

    # NOTE: The current `create_leave_request_service` expects start_date, end_date, type, duration.
    # If the UI sends a detailed daily_breakdown, the service needs adjustment,
    # or the router needs to extract the relevant info. Let's adjust the router to call
    # the service as it's currently defined for AI use, assuming basic input.
    # For a UI sending detailed breakdown, the service function should be refactored.

    # TEMPORARY: Extracting info assuming the service expects start/end/type/duration
    # This part might need adjustment based on how the UI calls this endpoint vs. the AI
    if not leave_in.daily_breakdown:
         raise HTTPException(status_code=400, detail="Daily breakdown is required.")

    # Infer start/end date, type, and duration from the breakdown for the service call
    # This makes assumptions - ideally, UI and AI use consistent service input
    start_date_str = min(d.date.isoformat() for d in leave_in.daily_breakdown)
    end_date_str = max(d.date.isoformat() for d in leave_in.daily_breakdown)
    # Assume type and duration are consistent for the range in this simplified call
    leave_type_str = leave_in.daily_breakdown[0].type.value if leave_in.daily_breakdown else 'vacation'
    duration_str = leave_in.daily_breakdown[0].duration.value if leave_in.daily_breakdown else 'full_day'


    try:
        created_leave = await create_leave_request_service(
            employee_id=leave_in.employee_id,
            reason=leave_in.reason,
            start_date_str=start_date_str,
            end_date_str=end_date_str,
            leave_type_str=leave_type_str,
            duration_str=duration_str
        )
        return created_leave # Return the result from the service function
    except HTTPException as e:
        raise e # Re-raise HTTP exceptions from the service
    except Exception as e:
        # Catch unexpected errors from the service
        print(f"Error calling create_leave_request_service: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred while creating the leave request.")


@router.put("/{leave_id}/status", response_model=LeaveInDB, dependencies=[Depends(require_permission("leave:approve"))])
async def update_leave_status(
    leave_id: str,
    leave_update: LeaveUpdate,
    current_user: Dict[str, Any] = Depends(get_current_employee)
):
    # Basic validation remains in the router
    update_data = leave_update.model_dump(exclude_unset=True)
    if not update_data or 'status' not in update_data:
        raise HTTPException(status_code=400, detail="No status update provided or status field missing")

    new_status_str = update_data['status']
    try:
        new_status_enum = LeaveStatusEnum(new_status_str) # Validate enum value
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status value '{new_status_str}'.")

    if new_status_enum not in [LeaveStatusEnum.approved, LeaveStatusEnum.rejected]:
         raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'.")

    # Call the service function to perform the update and send notification
    try:
        updated_leave = await update_leave_status_service(
            leave_id=leave_id,
            status=new_status_enum,
            updater_id=current_user["employee_id"],
            rejection_reason=update_data.get('rejection_reason') # Pass reason if provided
        )
        return updated_leave # Return result from service function
    except HTTPException as e:
        raise e # Re-raise HTTP exceptions from the service
    except Exception as e:
        # Catch unexpected errors
        print(f"Error calling update_leave_status_service: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred while updating the leave status.")


# --- GET endpoints remain the same ---
@router.get("", response_model=List[LeaveInDB], dependencies=[Depends(require_permission("leave:read_all"))])
async def list_all_leave_requests():
    # Use the 'collection' defined in this router
    leaves = await collection.find().sort("start_date", -1).to_list(1000)
    return leaves

@router.get("/me", response_model=List[LeaveInDB], dependencies=[Depends(require_permission("leave:read_self"))])
async def get_my_leave_requests(current_user: Dict[str, Any] = Depends(get_current_employee)):
     # Use the 'collection' defined in this router
    leaves = await collection.find({"employee_id": current_user["employee_id"]}).sort("start_date", -1).to_list(1000)
    return leaves