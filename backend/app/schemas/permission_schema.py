# backend/app/schemas/permission_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "permissions"

async def create_indexes(db: AsyncIOMotorDatabase):
    """Creates indexes for the permissions collection."""
    collection = db[COLLECTION]
    await collection.create_indexes([
        # Unique key for permission
        IndexModel([("permission_key", ASCENDING)], name="permission_key_unique", unique=True),
    ])
    print(f"Indexes ensured for collection: {COLLECTION}")