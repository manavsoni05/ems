import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.dependencies.auth import get_current_employee, require_role, require_permission
from app.models.employee_skill import EmployeeSkillInDB, EmployeeSkillCreate, EmployeeSkillUpdate

router = APIRouter(
    tags=["Employee Skills"],
    redirect_slashes=False
)

db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
collection = db.employee_skills

@router.post("", status_code=status.HTTP_201_CREATED, response_model=EmployeeSkillInDB, dependencies=[Depends(require_permission("skill:create"))])
async def add_employee_skill(skill_in: EmployeeSkillCreate):
    skill_doc = skill_in.model_dump()
    skill_doc["employee_skill_id"] = f"SKL-{uuid.uuid4().hex[:8].upper()}"
    skill_doc["is_deleted"] = False # <-- ADD THIS
    
    existing_skill = await collection.find_one({
        "employee_id": skill_in.employee_id,
        "skill_name": skill_in.skill_name,
        "is_deleted": False # <-- MODIFY FILTER
    })
    if existing_skill:
        raise HTTPException(status_code=400, detail="This skill is already assigned to the employee.")

    await collection.insert_one(skill_doc)
    # Return the full document from the DB
    created_skill = await collection.find_one({"employee_skill_id": skill_doc["employee_skill_id"]})
    return created_skill

@router.get("", response_model=List[Dict[str, Any]], dependencies=[Depends(require_permission("skill:read_all"))])
async def list_all_employee_skills():
    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}}}, # <-- ADD FILTER
        {
            "$lookup": {
                "from": "employees",
                "localField": "employee_id",
                "foreignField": "employee_id",
                "as": "employee_details"
            }
        },
        {"$unwind": {"path": "$employee_details", "preserveNullAndEmptyArrays": True}},
        # Also filter out deleted employees
        {"$match": {"employee_details.is_deleted": {"$ne": True}}}, # <-- ADD FILTER
        {
            "$project": {
                "_id": 0,
                "employee_skill_id": 1,
                "employee_id": 1,
                "first_name": {"$ifNull": ["$employee_details.first_name", "N/A"]},
                "last_name": {"$ifNull": ["$employee_details.last_name", ""]},
                "skill_name": 1,
                "proficiency_level": 1
            }
        }
    ]
    skills = await collection.aggregate(pipeline).to_list(1000)
    return skills

@router.get("/me", response_model=List[EmployeeSkillInDB], dependencies=[Depends(require_permission("skill:read_self"))])
async def get_my_skills(current_user: Dict[str, Any] = Depends(get_current_employee)):
    skills = await collection.find(
        {"employee_id": current_user["employee_id"], "is_deleted": {"$ne": True}} # <-- FILTER
    ).to_list(1000)
    return skills

@router.put("/{skill_id}", response_model=EmployeeSkillInDB, dependencies=[Depends(require_permission("skill:update"))])
async def update_employee_skill(skill_id: str, skill_update: EmployeeSkillUpdate):
    update_data = skill_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    result = await collection.update_one(
        {"employee_skill_id": skill_id, "is_deleted": {"$ne": True}}, # <-- FILTER
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Skill record not found")
    
    updated_skill = await collection.find_one({"employee_skill_id": skill_id})
    return updated_skill

@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("skill:delete"))])
async def delete_employee_skill(skill_id: str):
    # --- SOFT DELETE ---
    result = await collection.update_one(
        {"employee_skill_id": skill_id},
        {"$set": {"is_deleted": True}}
    )
    # --- END SOFT DELETE ---
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Skill not found")
    return