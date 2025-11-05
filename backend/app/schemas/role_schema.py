# TODO: implement later
# backend/app/schemas/role_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "roles"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("role_id", ASCENDING)], name="role_id_unique", unique=True)
    ])

async def get_role_by_id(db: AsyncIOMotorDatabase, role_id: str):
    return await db[COLLECTION].find_one({"role_id": role_id})