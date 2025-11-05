# backend/app/schemas/employee_schema.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING

COLLECTION = "employees"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("employee_id", ASCENDING)], name="employee_id_unique", unique=True),
        
        # --- MODIFIED INDEX ---
        # This index now only enforces uniqueness on non-deleted documents.
        IndexModel(
            [("email", ASCENDING)], 
            name="email_unique_soft_delete", # Renamed for clarity
            unique=True,
            partialFilterExpression={"is_deleted": False} # The fix: Only unique if not deleted
        ),
        # --- END MODIFICATION ---

        IndexModel([("is_active", ASCENDING)], name="is_active_idx"),
        IndexModel([("is_deleted", ASCENDING)], name="is_deleted_idx") # <-- ADD THIS
    ])

async def get_employee_by_id(db: AsyncIOMotorDatabase, employee_id: str):
    # This function is used by auth, so it should fetch even if deleted/inactive
    # The routers will handle filtering
    return await db[COLLECTION].find_one({"employee_id": employee_id})

async def create_employee(db: AsyncIOMotorDatabase, employee_data: dict):
    result = await db[COLLECTION].insert_one(employee_data)
    return await db[COLLECTION].find_one({"_id": result.inserted_id})