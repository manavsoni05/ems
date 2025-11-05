# backend/app/schemas/ai_conversation_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING
from datetime import datetime, timedelta

COLLECTION = "ai_conversations"

async def create_indexes(db: AsyncIOMotorDatabase):
    """Creates indexes for the ai_conversations collection."""
    collection = db[COLLECTION]
    await collection.create_indexes([
        # Index on conversation_id for quick lookups
        IndexModel([("conversation_id", ASCENDING)], name="conversation_id_unique", unique=True),
        # TTL index to automatically delete old conversations after inactivity (e.g., 1 day)
        IndexModel([("last_updated", DESCENDING)], name="conversation_ttl", expireAfterSeconds=int(timedelta(days=1).total_seconds()))
    ])
    print(f"Indexes ensured for collection: {COLLECTION}")