from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional
from .pyobjectid import PyObjectId
from .employee import EmployeeBase 

class AssetBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    asset_id: str = Field(..., description="Primary key")
    asset_name: str
    asset_type: str
    serial_number: str
    purchase_date: date
    status: str
    is_deleted: bool = Field(default=False) # <-- ADD THIS

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str},
    )

class AssetCreate(BaseModel):
    asset_name: str
    asset_type: str
    serial_number: str
    purchase_date: date

# --- ADD ASSET UPDATE MODEL ---
class AssetUpdate(BaseModel):
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    status: Optional[str] = None
    is_deleted: Optional[bool] = None
# --- END ADD ---

class AssetInDB(AssetBase):
    pass

class AllottedAssetBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    allotment_id: str = Field(..., description="Primary key")
    asset_id: str
    employee_id: str
    allotment_date: datetime
    return_date: Optional[datetime] = None
    is_deleted: bool = Field(default=False) # <-- ADD THIS

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str},
    )

class AllottedAssetInDB(AllottedAssetBase):
    pass

class AssetWithDetails(AssetBase):
    allotment_info: Optional[AllottedAssetBase] = None

class MyAssetResponse(AllottedAssetBase):
    asset_details: Optional[AssetBase] = None
    employee_details: Optional[EmployeeBase] = None