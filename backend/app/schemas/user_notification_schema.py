# backend/app/schemas/user_notification_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING

COLLECTION = "user_notifications"

async def create_indexes(db: AsyncIOMotorDatabase):
    """Creates indexes for the user_notifications collection."""
    collection = db[COLLECTION]
    await collection.create_indexes([
        # Unique ID for each link record
        IndexModel([("user_notification_id", ASCENDING)], name="user_notification_id_unique", unique=True),
        # Index for efficiently querying a user's notifications, sorted by date
        IndexModel(
            [("user_id", ASCENDING), ("deleted", ASCENDING), ("created_at", DESCENDING)],
            name="user_id_deleted_created_idx"
        ),
        # Index to potentially find all users linked to a specific notification event
        IndexModel([("notification_id", ASCENDING)], name="notification_id_idx")
    ])
    print(f"Indexes ensured for collection: {COLLECTION}")