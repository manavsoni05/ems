# TODO: implement later
# backend/app/schemas/report_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "reports"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("report_id", ASCENDING)], name="report_id_unique", unique=True)
    ])