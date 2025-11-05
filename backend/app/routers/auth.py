# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, Any
from datetime import timedelta

from app.config import settings
from app.dependencies.auth import (
    verify_password,
    get_current_employee,
    create_access_token,
    db, # <-- 1. Import db from auth dependency
    roles_collection # <-- 2. Import roles_collection from auth dependency
)
from app.schemas import employee_schema
from app.models.employee import Token
from app.models.employee import EmployeeBase

router = APIRouter()

@router.get("/me", response_model=EmployeeBase)
async def read_users_me(current_user: Dict[str, Any] = Depends(get_current_employee)):
    """Retrieves details for the currently authenticated user based on JWT."""
    # Use the db instance from the auth dependency
    employee = await employee_schema.get_employee_by_id(db, employee_id=current_user["employee_id"])
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Use the db instance from the auth dependency
    employee = await employee_schema.get_employee_by_id(db, employee_id=form_data.username)
    if not employee or not verify_password(form_data.password, employee["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect employee ID or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # --- 3. ADD PERMISSION FETCHING LOGIC ---
    user_permissions: List[str] = []
    role = await roles_collection.find_one({"role_id": employee["role_id"], "is_deleted": {"$ne": True}})
    if role:
        user_permissions = role.get("permission_keys", [])
    # --- END PERMISSION LOGIC ---

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # --- 4. ADD PERMISSIONS TO TOKEN DATA ---
    token_data = {
        "Employee_id": employee["employee_id"], 
        "role": employee["role_id"],
        "permissions": user_permissions # Add permissions list
    }
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    return {"message": "Successfully logged out (client should clear token)"}