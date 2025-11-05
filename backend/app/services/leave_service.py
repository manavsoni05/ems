# backend/app/services/leave_service.py
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.models.leave import LeaveStatusEnum, LeaveTypeEnum, LeaveDurationEnum # Added Enums
from fastapi import HTTPException
from datetime import datetime, timedelta, date, timezone # Added date, timezone
from app.services import notification_service # Ensure notification_service is imported

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]
collection = db.leaves
employees_collection = db.employees # Needed for notifications

async def create_leave_request_service(
    employee_id: str,
    reason: str,
    start_date_str: str,
    end_date_str: str,
    leave_type_str: str,
    # Add duration if AI can specify it, otherwise default
    duration_str: str = LeaveDurationEnum.full_day.value
):
    """
    Creates a leave request and sends notifications.
    Now includes notification logic moved from the router.
    """
    try:
        start_date = date.fromisoformat(start_date_str)
        end_date = date.fromisoformat(end_date_str)
        # Validate leave type and duration enums
        leave_type = LeaveTypeEnum(leave_type_str.lower().replace(' ', '_')) # Handle potential spaces
        duration = LeaveDurationEnum(duration_str)
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid date, leave type, or duration format: {e}")

    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date.")

    target_employee = await employees_collection.find_one({"employee_id": employee_id})
    if not target_employee:
        raise HTTPException(status_code=404, detail=f"Employee with ID {employee_id} not found.")

    daily_breakdown = []
    current = start_date
    while current <= end_date:
        daily_breakdown.append({
            "date": datetime.combine(current, datetime.min.time(), tzinfo=timezone.utc),
            "type": leave_type.value,
            "status": LeaveStatusEnum.pending.value,
            "duration": duration.value # Use provided or default duration
        })
        current = current + timedelta(days=1)

    if not daily_breakdown:
         raise HTTPException(status_code=400, detail="Leave request must contain at least one day.")


    leave_doc = {
        "leave_id": f"LVE-{uuid.uuid4().hex[:8].upper()}",
        "employee_id": employee_id,
        "start_date": datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc),
        "end_date": datetime.combine(end_date, datetime.min.time(), tzinfo=timezone.utc),
        "reason": reason,
        "status": LeaveStatusEnum.pending.value,
        "daily_breakdown": daily_breakdown,
        "applied_at": datetime.now(timezone.utc),
        "rejection_reason": None, "approved_by": None, "rejected_by": None,
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
    }

    insert_result = await collection.insert_one(leave_doc)
    if not insert_result.inserted_id:
        raise HTTPException(status_code=500, detail="Failed to save leave request.")

    # --- Notification Logic (Moved Here) ---
    employee_name = f"{target_employee.get('first_name', '')} {target_employee.get('last_name', '')}".strip()
    admin_hr_ids = await notification_service.get_admin_hr_ids()
    # Combine employee and admin/hr IDs, ensuring uniqueness
    recipient_ids = list(set([employee_id] + admin_hr_ids))

    await notification_service.create_notification(
        recipient_ids=recipient_ids,
        message_self="Your leave request has been submitted.", # Message for employee
        message_other=f"New leave request ({leave_doc['leave_id']}) submitted by {employee_name}.", # Message for admin/hr
        link_self="/employee/my-leaves",
        link_other="/admin/manage-leaves", # Adjust based on admin/hr common path
        type="leave_request",
        subject_employee_id=employee_id # Employee the request is about
    )
    # --- End Notification Logic ---

    # Fetch the created document to return (optional, depends if AI needs confirmation)
    created_leave = await collection.find_one({"leave_id": leave_doc["leave_id"]})
    if not created_leave:
        # Log error, but don't necessarily fail the operation if notification sent
        print(f"Warning: Failed to retrieve created leave request {leave_doc['leave_id']} after insertion.")
    return created_leave # Return the created document


async def update_leave_status_service(
    leave_id: str,
    status: LeaveStatusEnum,
    updater_id: str, # Renamed from approver_id for clarity
    rejection_reason: str = None
):
    """
    Updates leave status and sends notifications.
    Now includes notification logic moved from the router.
    """
    # Validate status
    if status not in [LeaveStatusEnum.approved, LeaveStatusEnum.rejected]:
         raise HTTPException(status_code=400, detail=f"Invalid target status provided: {status}. Must be 'approved' or 'rejected'.")

    # Find the leave request
    leave_request = await collection.find_one({"leave_id": leave_id})
    if not leave_request:
        raise HTTPException(status_code=404, detail=f"Leave request with ID {leave_id} not found")

    # Check if already processed
    if leave_request['status'] != LeaveStatusEnum.pending.value:
        raise HTTPException(status_code=400, detail=f"Leave request {leave_id} is already '{leave_request['status']}'. Only pending requests can be updated.")

    # Prepare update fields
    fields_to_set = {
        "status": status.value,
        "updated_at": datetime.now(timezone.utc)
    }
    if status == LeaveStatusEnum.approved:
        fields_to_set["approved_by"] = updater_id
        fields_to_set["rejected_by"] = None # Clear potential previous rejection info if somehow set
        fields_to_set["rejection_reason"] = None
    elif status == LeaveStatusEnum.rejected:
        fields_to_set["rejected_by"] = updater_id
        fields_to_set["approved_by"] = None # Clear potential previous approval info
        # Use provided reason or a default
        fields_to_set["rejection_reason"] = rejection_reason if rejection_reason else "No reason provided."

    # Perform the update
    result = await collection.update_one(
        {"leave_id": leave_id},
        {"$set": fields_to_set}
    )

    if result.matched_count == 0:
        # Should not happen if find_one succeeded, but handles race conditions
        raise HTTPException(status_code=404, detail=f"Leave request {leave_id} not found during update.")
    if result.modified_count == 0:
        # This might happen if the status was already set somehow between find and update
         print(f"Warning: Leave request {leave_id} status was likely already {status.value}, no modification made.")


    # --- Notification Logic (Moved Here) ---
    recipient_ids = [leave_request["employee_id"]] # Only notify the employee whose leave it is

    # Get details for message construction
    employee_subject = await employees_collection.find_one({"employee_id": leave_request["employee_id"]})
    employee_name = f"{employee_subject.get('first_name', '')} {employee_subject.get('last_name', '')}".strip() if employee_subject else "Employee"

    updater = await employees_collection.find_one({"employee_id": updater_id})
    updater_name = f"{updater.get('first_name', '')} {updater.get('last_name', '')}".strip() if updater else updater_id

    # Define messages
    message_self = f"Your leave request ({leave_id}) has been {status.value} by {updater_name}."
    # Message for others (e.g., if admins/hr need notifying about updates too)
    message_other = f"Leave request ({leave_id}) for {employee_name} has been {status.value} by {updater_name}."

    if status == LeaveStatusEnum.rejected and fields_to_set.get("rejection_reason"):
        message_self += f" Reason: {fields_to_set['rejection_reason']}"
        message_other += f" Reason: {fields_to_set['rejection_reason']}"

    # Decide recipients - often just the employee for status updates
    final_recipient_ids = recipient_ids
    # Uncomment below if Admins/HR should also be notified of status changes
    # admin_hr_ids = await notification_service.get_admin_hr_ids()
    # admin_hr_ids = [uid for uid in admin_hr_ids if uid != leave_request["employee_id"]] # Exclude employee if they are admin/hr
    # final_recipient_ids = list(set(recipient_ids + admin_hr_ids))


    await notification_service.create_notification(
        recipient_ids=final_recipient_ids, # Send only to employee, or combined list
        message_self=message_self,
        message_other=message_other, # This will likely not be used if only employee is recipient
        link_self="/employee/my-leaves",
        link_other="/admin/manage-leaves", # Link for admin/hr if they were recipients
        type="leave_status",
        subject_employee_id=leave_request["employee_id"]
    )
    # --- End Notification Logic ---

    # Fetch and return the updated leave request
    updated_leave = await collection.find_one({"leave_id": leave_id})
    if not updated_leave:
        raise HTTPException(status_code=500, detail="Failed to retrieve updated leave request after status change.")
    return updated_leave