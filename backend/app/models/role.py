# backend/app/models/role.py
from pydantic import BaseModel, Field
from typing import List, Optional

class RoleBase(BaseModel):
    role_id: str = Field(..., description="Unique identifier for the role (e.g., 'admin', 'hr')")
    role_name: str
    permission_keys: List[str] = Field(default=[], description="List of permission_key strings")
    is_deleted: bool = Field(default=False) # <-- ADD THIS

class RoleCreate(BaseModel):
    role_id: str = Field(..., description="Unique identifier for the role (e.g., 'manager')")
    role_name: str
    permission_keys: List[str] = Field(default=[])

class RoleUpdate(BaseModel):
    role_name: Optional[str] = None
    permission_keys: Optional[List[str]] = None
    is_deleted: Optional[bool] = None # <-- ADD THIS

class RoleInDB(RoleBase):
    pass