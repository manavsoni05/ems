# backend/app/services/asset_service.py
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from datetime import datetime
from fastapi import HTTPException

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]
assets_collection = db.assets
allotted_collection = db.allotted_assets

async def allot_asset_service(asset_id: str, employee_id: str):
    asset = await assets_collection.find_one({"asset_id": asset_id})
    if not asset or asset["status"] != "Available":
        raise HTTPException(status_code=400, detail="Asset is not available for allotment")
    if not await db.employees.find_one({"employee_id": employee_id}):
        raise HTTPException(status_code=404, detail="Employee not found")
        
    allotment_doc = {
        "allotment_id": f"ALLOT-{uuid.uuid4().hex[:8].upper()}",
        "asset_id": asset_id,
        "employee_id": employee_id,
        "allotment_date": datetime.utcnow(),
        "return_date": None
    }
    await allotted_collection.insert_one(allotment_doc)
    await assets_collection.update_one(
        {"asset_id": asset_id},
        {"$set": {"status": "Allotted"}}
    )
    return {"detail": "Asset allotted successfully"}