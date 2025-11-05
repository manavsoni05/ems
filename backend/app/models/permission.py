# backend/app/models/permission.py
from pydantic import BaseModel, Field
from typing import Optional
from .pyobjectid import PyObjectId
from pydantic import ConfigDict

class PermissionBase(BaseModel):
    """
    Represents a single granular permission in the system.
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    permission_key: str = Field(..., description="Unique key for the permission (e.g., 'employee:create')")
    description: str = Field(..., description="User-friendly description of what the permission allows")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str},
    )

class PermissionInDB(PermissionBase):
    pass