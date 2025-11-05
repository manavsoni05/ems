# backend/app/services/notification_service.py
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from datetime import datetime, timezone
from typing import List, Optional

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]
notifications_collection = db.notifications
user_notifications_collection = db.user_notifications # New linking collection
employees_collection = db.employees

async def get_admin_hr_ids() -> List[str]:
    """Fetches employee IDs for users with 'admin' or 'hr' roles."""
    admin_hr_cursor = employees_collection.find(
        {"role_id": {"$in": ["admin", "hr"]}},
        {"employee_id": 1, "_id": 0}
    )
    return [emp["employee_id"] async for emp in admin_hr_cursor]

async def create_notification(
    recipient_ids: List[str],
    message_self: str,              # Message for the subject employee
    message_other: str,             # Message for others (admin/hr)
    link_self: Optional[str] = None,  # Link for the subject employee
    link_other: Optional[str] = None, # Link for others (admin/hr)
    type: str = "general",
    subject_employee_id: Optional[str] = None # The employee the notification is about
):
    """
    Creates a single notification document with different message/link versions
    and links it to multiple recipients.
    """
    if not recipient_ids:
        print("Warning: create_notification called with no recipient_ids.")
        return None # Return None or raise an error as appropriate

    # 1. Create the core notification document with both message/link versions
    notification_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
    notification_doc = {
        "notification_id": notification_id,
        "message_self": message_self,
        "message_other": message_other,
        "timestamp": datetime.now(timezone.utc),
        "link_self": link_self,
        "link_other": link_other,
        "type": type,
        "subject_employee_id": subject_employee_id
    }
    insert_result = await notifications_collection.insert_one(notification_doc)
    if not insert_result.inserted_id:
         print(f"Error: Failed to insert notification document for {notification_id}")
         return None # Or raise

    # 2. Create linking documents for each unique recipient
    user_notification_docs = []
    unique_recipient_ids = list(set(recipient_ids)) # Ensure no duplicates

    for user_id in unique_recipient_ids:
        # Check if employee exists before creating link
        employee_exists = await employees_collection.count_documents({"employee_id": user_id}) > 0
        if not employee_exists:
            print(f"Warning: Skipping notification link for non-existent employee_id: {user_id}")
            continue

        user_notification_docs.append({
            "user_notification_id": f"UNS-{uuid.uuid4().hex[:8].upper()}",
            "user_id": user_id,
            "notification_id": notification_id,
            "read_status": False,
            "deleted": False,
            "created_at": notification_doc["timestamp"] # Use same timestamp for sorting
        })

    if user_notification_docs:
        insert_many_result = await user_notifications_collection.insert_many(user_notification_docs)
        print(f"Created notification {notification_id} and linked to {len(insert_many_result.inserted_ids)} recipients.")
    else:
        print(f"Notification {notification_id} created, but no valid recipients to link.")

    return notification_doc # Return the created notification document