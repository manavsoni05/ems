# backend/app/schemas/allotted_asset_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "allotted_assets"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("allotment_id", ASCENDING)], name="allotment_id_unique", unique=True),
        IndexModel([("asset_id", ASCENDING)], name="allotted_asset_id"),
        IndexModel([("employee_id", ASCENDING)], name="allotted_employee_id"),
        IndexModel([("is_deleted", ASCENDING)], name="is_deleted_idx") # <-- ADD THIS
    ])