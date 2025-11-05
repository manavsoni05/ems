# backend/app/routers/role_management.py
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
from app.config import settings
from app.dependencies.auth import require_role # Use require_role for bootstrapping
from app.models.role import RoleInDB, RoleCreate, RoleUpdate
from app.models.permission import PermissionInDB

router = APIRouter(
    tags=["Role Management"],
    redirect_slashes=False
)

db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
roles_collection = db.roles
permissions_collection = db.permissions

@router.get("/permissions", response_model=List[PermissionInDB], dependencies=[Depends(require_role(["admin"]))])
async def list_all_permissions():
    """
    Retrieves a list of all available permissions in the system.
    (Path: GET /roles/permissions)
    """
    permissions = await permissions_collection.find().to_list(1000)
    return permissions

@router.get("", response_model=List[RoleInDB], dependencies=[Depends(require_role(["admin"]))])
async def list_all_roles():
    """
    Retrieves a list of all non-deleted roles.
    (Path: GET /roles)
    """
    roles = await roles_collection.find({"is_deleted": {"$ne": True}}).to_list(1000)
    return roles

@router.get("/{role_id}", response_model=RoleInDB, dependencies=[Depends(require_role(["admin"]))])
async def get_role_details(role_id: str):
    """
    Retrieves details for a single role.
    (Path: GET /roles/{role_id})
    """
    role = await roles_collection.find_one({"role_id": role_id, "is_deleted": {"$ne": True}})
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return role

@router.post("", response_model=RoleInDB, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_role(["admin"]))])
async def create_new_role(role_in: RoleCreate):
    """
    Creates a new role.
    (Path: POST /roles)
    """
    existing_role = await roles_collection.find_one({"role_id": role_in.role_id})
    if existing_role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role with this ID already exists")
    
    role_doc = role_in.model_dump()
    role_doc["is_deleted"] = False
    
    await roles_collection.insert_one(role_doc)
    
    created_role = await roles_collection.find_one({"role_id": role_in.role_id})
    return created_role

@router.put("/{role_id}", response_model=RoleInDB, dependencies=[Depends(require_role(["admin"]))])
async def update_existing_role(role_id: str, role_update: RoleUpdate):
    """
    Updates a role's name and/or its permission keys.
    (Path: PUT /roles/{role_id})
    """
    update_data = role_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided")
        
    result = await roles_collection.update_one(
        {"role_id": role_id, "is_deleted": {"$ne": True}},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        
    updated_role = await roles_collection.find_one({"role_id": role_id})
    return updated_role

@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role(["admin"]))])
async def delete_existing_role(role_id: str):
    """
    Soft-deletes a role.
    (Path: DELETE /roles/{role_id})
    """
    if role_id in ["admin", "hr", "employee"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete core system roles")
        
    result = await roles_collection.update_one(
        {"role_id": role_id},
        {"$set": {"is_deleted": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    
    return