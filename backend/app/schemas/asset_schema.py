# backend/app/schemas/asset_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "assets"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("asset_id", ASCENDING)], name="asset_id_unique", unique=True),
        # --- MODIFY UNIQUE INDEX ---
        IndexModel(
            [("serial_number", ASCENDING)], 
            name="serial_number_unique_soft_delete", 
            unique=True,
            partialFilterExpression={"is_deleted": False} # Only unique if not deleted
        ),
        # --- ADD NEW INDEX ---
        IndexModel([("is_deleted", ASCENDING)], name="is_deleted_idx")
    ])