from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from .pyobjectid import PyObjectId

class LeaveStatusEnum(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    partially_approved = "partially_approved"

class LeaveTypeEnum(str, Enum):
    vacation = "vacation"
    sick = "sick"
    wfh = "work_from_home"
    personal = "personal"

# NEW: Enum for leave duration
class LeaveDurationEnum(str, Enum):
    full_day = "full_day"
    half_day = "half_day"

class DailyBreakdownItem(BaseModel):
    date: date
    type: LeaveTypeEnum
    status: LeaveStatusEnum
    duration: LeaveDurationEnum = Field(default=LeaveDurationEnum.full_day) # ADDED: duration field

class LeaveBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    leave_id: str = Field(..., description="Primary key")
    employee_id: str
    start_date: date
    end_date: date
    reason: str = Field(..., max_length=500) # Add max_length
    status: LeaveStatusEnum
    daily_breakdown: List[DailyBreakdownItem]
    rejection_reason: Optional[str] = None
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    approved_by: Optional[str] = None
    rejected_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str},
    )

class LeaveCreate(BaseModel):
    employee_id: str
    reason: str = Field(..., max_length=500) # Add max_length
    daily_breakdown: List[DailyBreakdownItem] # This will now accept duration from the frontend

class LeaveUpdate(BaseModel):
    status: Optional[LeaveStatusEnum] = None
    rejection_reason: Optional[str] = None
    approved_by: Optional[str] = None
    rejected_by: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LeaveInDB(LeaveBase):
    pass