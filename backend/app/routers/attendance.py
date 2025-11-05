# backend/app/routers/attendance.py
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional # <-- 'Optional' has been added here
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.dependencies.auth import get_current_employee, require_role
# --- Import the new response model and BaseModel ---
from app.models.attendance import AttendanceInDB, AttendanceResponseWithName
from pydantic import BaseModel
from datetime import datetime, date, timedelta, timezone
from calendar import monthrange
from app.services import notification_service

router = APIRouter(
    tags=["Attendance"],
    redirect_slashes=False
)

db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
collection = db.attendance
employees_collection = db.employees

# --- NEW: Add a response model for the status ---
class AttendanceStatusResponse(BaseModel):
    status: str
    active_check_in: Optional[AttendanceInDB] = None

# --- NEW: Endpoint to get current check-in status ---
@router.get("/me/status", response_model=AttendanceStatusResponse)
async def get_my_attendance_status(current_user: Dict[str, Any] = Depends(get_current_employee)):
    """
    Checks if the current user has an active check-in (checked in but not checked out).
    """
    employee_id = current_user["employee_id"]
    today = date.today()
    start_of_day = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)

    # Find the most recent check-in for today that hasn't been checked out
    active_check_in = await collection.find_one({
        "employee_id": employee_id,
        "check_in_time": {"$gte": start_of_day},
        "check_out_time": None
    }, sort=[("check_in_time", -1)])

    if active_check_in:
        return {"status": "checked_in", "active_check_in": active_check_in}
    else:
        return {"status": "checked_out", "active_check_in": None}


# --- Use AttendanceResponseWithName as response_model ---
@router.post("/check-in", status_code=status.HTTP_201_CREATED, response_model=AttendanceResponseWithName)
async def check_in(current_user: Dict[str, Any] = Depends(get_current_employee)):
    """Handles employee check-in, sends notifications, and returns record with name."""
    employee_id = current_user["employee_id"]
    today = date.today()
    start_of_day = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)

    existing_attendance = await collection.find_one({
        "employee_id": employee_id,
        "check_in_time": {"$gte": start_of_day},
        "check_out_time": None
    })
    if existing_attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have an active check-in for today. Please check out before checking in again."
        )

    attendance_doc = {
        "attendance_id": f"ATT-{uuid.uuid4().hex[:8].upper()}",
        "employee_id": employee_id,
        "check_in_time": datetime.now(timezone.utc),
        "check_out_time": None,
        "status": "Present"
    }
    insert_result = await collection.insert_one(attendance_doc)
    if not insert_result.inserted_id:
        raise HTTPException(status_code=500, detail="Failed to record check-in.")

    created_attendance = await collection.find_one({"attendance_id": attendance_doc["attendance_id"]})
    if not created_attendance:
         raise HTTPException(status_code=500, detail="Failed to retrieve created attendance record after check-in.")

    # --- Fetch employee name ---
    employee = await employees_collection.find_one({"employee_id": employee_id})
    employee_name = f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip() if employee else ""
    first_name = employee.get('first_name') if employee else None
    last_name = employee.get('last_name') if employee else None
    # --- End fetch employee name ---

    # --- Notification Logic (using fetched name) ---
    admin_hr_ids = await notification_service.get_admin_hr_ids()
    recipient_ids = list(set([employee_id] + admin_hr_ids))

    await notification_service.create_notification(
        recipient_ids=recipient_ids,
        message_self="You have successfully checked in.",
        message_other=f"{employee_name or employee_id} has checked in.", # Use name if available
        link_self="/employee/my-attendance",
        link_other="/admin/attendance-report",
        type="check_in",
        subject_employee_id=employee_id
    )
    # --- End Notification Logic ---

    # --- Combine data for response ---
    response_data = {**created_attendance, "first_name": first_name, "last_name": last_name}
    return response_data
    # --- End combine data ---

# --- Use AttendanceResponseWithName as response_model ---
@router.put("/check-out", status_code=status.HTTP_200_OK, response_model=AttendanceResponseWithName)
async def check_out(current_user: Dict[str, Any] = Depends(get_current_employee)):
    """Handles employee check-out, sends notifications, and returns record with name."""
    employee_id = current_user["employee_id"]
    today = date.today()
    start_of_day = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)

    attendance_record = await collection.find_one({
        "employee_id": employee_id,
        "check_in_time": {"$gte": start_of_day},
        "check_out_time": None
    }, sort=[("check_in_time", -1)])

    if not attendance_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active check-in found for today to check out from."
        )

    update_result = await collection.update_one(
        {"_id": attendance_record["_id"]},
        {"$set": {"check_out_time": datetime.now(timezone.utc)}}
    )

    if update_result.matched_count == 0:
         raise HTTPException(status_code=404, detail="Could not find the specific check-in record to update during check-out.")

    updated_attendance_record = await collection.find_one({"_id": attendance_record["_id"]})
    if not updated_attendance_record:
         raise HTTPException(status_code=404, detail="Could not retrieve updated attendance record after check-out.")


    # --- Fetch employee name ---
    employee = await employees_collection.find_one({"employee_id": employee_id})
    employee_name = f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip() if employee else ""
    first_name = employee.get('first_name') if employee else None
    last_name = employee.get('last_name') if employee else None
    # --- End fetch employee name ---

    # --- Notification Logic (using fetched name) ---
    admin_hr_ids = await notification_service.get_admin_hr_ids()
    recipient_ids = list(set([employee_id] + admin_hr_ids))

    await notification_service.create_notification(
        recipient_ids=recipient_ids,
        message_self="You have successfully checked out.",
        message_other=f"{employee_name or employee_id} has checked out.", # Use name if available
        link_self="/employee/my-attendance",
        link_other="/admin/attendance-report",
        type="check_out",
        subject_employee_id=employee_id
    )
    # --- End Notification Logic ---

    # --- Combine data for response ---
    response_data = {**updated_attendance_record, "first_name": first_name, "last_name": last_name}
    return response_data
    # --- End combine data ---


# --- Rest of the endpoints (get_today_status_report, etc.) remain unchanged ---
@router.get("/today-status", response_model=List[Dict[str, Any]], dependencies=[Depends(require_role(["admin", "hr"]))])
async def get_today_status_report():
    # ... (implementation remains the same) ...
    today = date.today()
    start_of_day = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    end_of_day = datetime.combine(today, datetime.max.time(), tzinfo=timezone.utc)
    today_start_dt = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)


    pipeline = [
        {
            "$lookup": {
                "from": "attendance",
                "let": {"employee_id_lookup": "$employee_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$employee_id", "$$employee_id_lookup"]},
                                    {"$gte": ["$check_in_time", start_of_day]},
                                    {"$lt": ["$check_in_time", end_of_day]}
                                ]
                            }
                        }
                    },
                    {"$sort": {"check_in_time": -1}},
                    {"$limit": 1}
                ],
                "as": "today_attendance"
            }
        },
        {
            "$unwind": {
                "path": "$today_attendance",
                "preserveNullAndEmptyArrays": True
            }
        },
        {
             "$lookup": {
                 "from": "leaves",
                 "let": {"employee_id_leave": "$employee_id"},
                 "pipeline": [
                     {
                         "$match": {
                             "$expr": {
                                 "$and": [
                                     {"$eq": ["$employee_id", "$$employee_id_leave"]},
                                     {"$in": ["$status", ["approved", "partially_approved"]]},
                                     {"$lte": ["$start_date", today_start_dt]},
                                     {"$gte": ["$end_date", today_start_dt]}
                                 ]
                             }
                         }
                     },
                     {"$limit": 1}
                 ],
                 "as": "today_leave"
             }
         },
        {
            "$project": {
                "_id": 0,
                "employee_id": 1,
                "first_name": 1,
                "last_name": 1,
                "check_in_time": "$today_attendance.check_in_time",
                "check_out_time": "$today_attendance.check_out_time",
                "status": {
                    "$cond": {
                        "if": {"$ifNull": ["$today_attendance.status", False]},
                        "then": "$today_attendance.status",
                        "else": {
                            "$cond": {
                                "if": {"$gt": [{"$size": "$today_leave"}, 0]},
                                "then": "On Leave",
                                "else": "Absent"
                            }
                        }
                    }
                }
            }
        },
         {
            "$sort": {"first_name": 1, "last_name": 1}
         }
    ]
    report = await employees_collection.aggregate(pipeline).to_list(None)
    return report

@router.get("/employee/{employee_id}/first-checkin", dependencies=[Depends(require_role(["admin", "hr"]))])
async def get_first_checkin(employee_id: str):
    # ... (implementation remains the same) ...
    first_record = await collection.find_one(
        {"employee_id": employee_id},
        sort=[("check_in_time", 1)]
    )
    if not first_record:
        return {"first_check_in": None}
    return {"first_check_in": first_record["check_in_time"]}

@router.get("/employee/{employee_id}", response_model=List[AttendanceInDB], dependencies=[Depends(require_role(["admin", "hr"]))])
async def get_employee_attendance_by_month(employee_id: str, year: int, month: int):
    # ... (implementation remains the same) ...
    if not (1 <= month <= 12):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid month provided (1-12).")
    if not (1970 < year < 2100):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid year provided.")

    try:
        _, num_days = monthrange(year, month)
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        end_date = datetime(year, month, num_days, 23, 59, 59, 999999, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date parameters.")

    records = await collection.find({
        "employee_id": employee_id,
        "check_in_time": {
            "$gte": start_date,
            "$lte": end_date
        }
    }).sort("check_in_time", 1).to_list(1000)
    return records

@router.get("/me", response_model=List[AttendanceInDB])
async def get_my_attendance(current_user: Dict[str, Any] = Depends(get_current_employee)):
    # ... (implementation remains the same) ...
    records = await collection.find(
        {"employee_id": current_user["employee_id"]}
    ).sort("check_in_time", -1).to_list(1000)
    return records

@router.get("/report", response_model=List[Dict[str, Any]], dependencies=[Depends(require_role(["admin", "hr"]))])
async def get_full_attendance_report(
    start_date: date | None = None,
    end_date: date | None = None,
    employee_id: str | None = None,
    limit: int = 100,
    skip: int = 0
    ):
    # ... (implementation remains the same) ...
    query = {}
    if employee_id:
        query["employee_id"] = employee_id

    date_filter = {}
    if start_date:
        date_filter["$gte"] = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
    if end_date:
        date_filter["$lte"] = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
    if date_filter:
        query["check_in_time"] = date_filter

    pipeline = [
        {"$match": query},
        {"$sort": {"check_in_time": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "employees",
                "localField": "employee_id",
                "foreignField": "employee_id",
                "as": "employee_details"
            }
        },
        {"$unwind": {"path": "$employee_details", "preserveNullAndEmptyArrays": True}},
        {
            "$project": {
                "_id": 0,
                "attendance_id": 1,
                "employee_id": 1,
                "first_name": "$employee_details.first_name",
                "last_name": "$employee_details.last_name",
                "check_in_time": 1,
                "check_out_time": 1,
                "status": 1
            }
        }
    ]

    report = await collection.aggregate(pipeline).to_list(None)
    return report