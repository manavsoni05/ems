# backend/app/schemas/performance_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "performance_reviews"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("review_id", ASCENDING)], name="review_id_unique", unique=True),
        IndexModel([("employee_id", ASCENDING)], name="performance_employee_id"),
        IndexModel([("is_deleted", ASCENDING)], name="is_deleted_idx") # <-- ADD THIS
    ])