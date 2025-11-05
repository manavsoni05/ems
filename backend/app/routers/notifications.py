# backend/app/routers/notifications.py
from fastapi import APIRouter, Depends, status, HTTPException
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.dependencies.auth import get_current_employee
# Use the new combined model
from app.models.notification import NotificationWithStatus
from app.models.user_notification import UserNotificationStatusUpdate

router = APIRouter(
    tags=["Notifications"],
    redirect_slashes=False
)

db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
notifications_collection = db.notifications
user_notifications_collection = db.user_notifications

# backend/app/routers/notifications.py
# ... (imports and other code remain the same) ...

@router.get("/me", response_model=List[NotificationWithStatus])
async def get_my_notifications(current_user: Dict[str, Any] = Depends(get_current_employee)):
    """
    Retrieves the current user's notifications, selecting the appropriate
    message and link based on whether the user is the subject of the notification.
    Includes fallbacks for potentially missing message/link fields.
    """
    user_id = current_user["employee_id"]
    pipeline = [
        # 1. Match links for the current user that aren't deleted
        {"$match": {"user_id": user_id, "deleted": False}},
        # 2. Sort by creation date descending
        {"$sort": {"created_at": -1}},
        # 3. Limit results
        {"$limit": 50},
        # 4. Join with the core notifications data
        {"$lookup": {
            "from": "notifications",
            "localField": "notification_id",
            "foreignField": "notification_id",
            "as": "notification_details"
        }},
        # 5. Unwind the details (should be only one)
        {"$unwind": "$notification_details"},
        # 6. Project the final structure, choosing message/link with fallbacks
        {"$project": {
            "_id": 0,
            "notification_id": "$notification_details.notification_id",
            # --- Select Message (Added $ifNull for robustness) ---
            "display_message": {
                "$cond": {
                    "if": {
                         "$and": [
                             {"$ne": ["$notification_details.subject_employee_id", None]},
                             {"$eq": ["$user_id", "$notification_details.subject_employee_id"]}
                         ]
                     },
                    # Use message_self if available, else message_other, else a default
                    "then": {"$ifNull": ["$notification_details.message_self", "$notification_details.message_other", "Notification received."]},
                    # Use message_other if available, else message_self, else a default
                    "else": {"$ifNull": ["$notification_details.message_other", "$notification_details.message_self", "Notification received."]}
                }
            },
            "timestamp": "$notification_details.timestamp",
             # --- Select Link (Added $ifNull for robustness) ---
            "display_link": {
                 "$cond": {
                     "if": {
                         "$and": [
                             {"$ne": ["$notification_details.subject_employee_id", None]},
                             {"$eq": ["$user_id", "$notification_details.subject_employee_id"]}
                         ]
                     },
                    "then": {"$ifNull": ["$notification_details.link_self", None]}, # Use link_self or null
                    "else": {"$ifNull": ["$notification_details.link_other", None]} # Use link_other or null
                 }
            },
            "type": {"$ifNull": ["$notification_details.type", "general"]}, # Add fallback for type
            "subject_employee_id": "$notification_details.subject_employee_id", # Can be null
            "user_notification_id": "$user_notification_id",
            "read_status": "$read_status"
        }}
    ]
    user_notifications_list = await user_notifications_collection.aggregate(pipeline).to_list(None)

    # Optional: Add server-side logging to check the raw output before validation
    # print("Raw aggregation output:", user_notifications_list)

    return user_notifications_list

# --- PUT /read, POST /read-all, DELETE endpoints remain the same ---
@router.put("/{user_notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_as_read(user_notification_id: str, current_user: Dict[str, Any] = Depends(get_current_employee)):
    result = await user_notifications_collection.update_one(
        {"user_notification_id": user_notification_id, "user_id": current_user["employee_id"]},
        {"$set": {"read_status": True}}
    )
    if result.matched_count == 0:
        print(f"Warning: No unread notification link found with ID {user_notification_id} for user {current_user['employee_id']} to mark as read.")
    return

@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_as_read(current_user: Dict[str, Any] = Depends(get_current_employee)):
    await user_notifications_collection.update_many(
        {"user_id": current_user["employee_id"], "read_status": False, "deleted": False},
        {"$set": {"read_status": True}}
    )
    return

@router.delete("/{user_notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(user_notification_id: str, current_user: Dict[str, Any] = Depends(get_current_employee)):
    result = await user_notifications_collection.update_one(
        {"user_notification_id": user_notification_id, "user_id": current_user["employee_id"]},
        {"$set": {"deleted": True}}
    )
    if result.matched_count == 0:
        print(f"Warning: No active notification link found with ID {user_notification_id} for user {current_user['employee_id']} to delete.")
    return