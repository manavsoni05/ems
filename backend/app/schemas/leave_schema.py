# TODO: implement later
# backend/app/schemas/leave_schema.py
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING
from app.models.leave import LeaveCreate
from datetime import date
from typing import List, Dict, Any

COLLECTION = "leaves"

async def create_indexes(db: AsyncIOMotorDatabase):
    collection = db[COLLECTION]
    await collection.create_indexes([
        IndexModel([("leave_id", ASCENDING)], name="leave_id_unique", unique=True),
        IndexModel([("employee_id", ASCENDING)], name="leave_employee_id")
    ])

async def create_leave_request(db: AsyncIOMotorDatabase, leave_data: LeaveCreate) -> Dict[str, Any]:
    start_date = min(d.date for d in leave_data.daily_breakdown)
    end_date = max(d.date for d in leave_data.daily_breakdown)
    
    leave_doc = {
        "leave_id": f"LVE-{uuid.uuid4().hex[:6].upper()}",
        "employee_id": leave_data.employee_id,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "reason": leave_data.reason,
        "status": "pending",
        "daily_breakdown": [d.dict() for d in leave_data.daily_breakdown]
    }
    
    # Convert dates to strings for MongoDB
    for item in leave_doc["daily_breakdown"]:
        item["date"] = item["date"].isoformat()
        
    await db[COLLECTION].insert_one(leave_doc)
    return leave_doc