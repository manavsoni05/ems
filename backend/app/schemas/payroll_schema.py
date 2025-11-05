# backend/app/schemas/payroll_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "payroll"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("payroll_id", ASCENDING)], name="payroll_id_unique", unique=True),
        IndexModel([("employee_id", ASCENDING)], name="payroll_employee_id"),
        IndexModel([("is_deleted", ASCENDING)], name="is_deleted_idx") # <-- ADD THIS
    ])