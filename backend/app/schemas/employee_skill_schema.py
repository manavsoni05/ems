# backend/app/schemas/employee_skill_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "employee_skills"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("employee_skill_id", ASCENDING)], name="employee_skill_id_unique", unique=True),
        IndexModel(
            [("employee_id", ASCENDING), ("skill_name", ASCENDING), ("is_deleted", ASCENDING)], # <-- MODIFY
            name="employee_skill_compound_unique_soft_delete", # <-- RENAME
            unique=True,
            partialFilterExpression={"is_deleted": False} # <-- ADD PARTIAL FILTER
        ),
        IndexModel([("is_deleted", ASCENDING)], name="is_deleted_idx") # <-- ADD THIS
    ])