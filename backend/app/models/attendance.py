# backend/app/models/attendance.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional # <-- Add Optional

class AttendanceBase(BaseModel):
    attendance_id: str = Field(..., description="Primary key")
    employee_id: str = Field(..., description="Foreign key to Employees")
    check_in_time: datetime
    check_out_time: datetime | None = None
    status: str # e.g., 'Present', 'On Leave'

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    check_out_time: datetime | None = None
    status: str | None = None

class AttendanceInDB(AttendanceBase):
    pass

# --- NEW RESPONSE MODEL ---
class AttendanceResponseWithName(AttendanceBase):
    """Attendance record including employee's name."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
# --- END NEW RESPONSE MODEL ---