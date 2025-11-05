# TODO: implement later
# backend/app/schemas/attendance_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "attendance"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("attendance_id", ASCENDING)], name="attendance_id_unique", unique=True),
        IndexModel([("employee_id", ASCENDING)], name="attendance_employee_id")
    ])