# TODO: implement later
# backend/app/schemas/audit_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, DESCENDING

COLLECTION = "audit_logs"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("timestamp", DESCENDING)], name="audit_timestamp")
    ])