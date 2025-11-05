from pydantic import BaseModel, Field
from typing import Optional

class EmployeeSkillBase(BaseModel):
    employee_skill_id: str = Field(..., description="Primary key")
    employee_id: str = Field(..., description="Foreign key to Employees")
    skill_name: str
    proficiency_level: str # e.g., 'Beginner', 'Intermediate', 'Expert'
    is_deleted: bool = Field(default=False) # <-- ADD THIS

class EmployeeSkillCreate(BaseModel):
    employee_id: str
    skill_name: str
    proficiency_level: str

class EmployeeSkillUpdate(BaseModel):
    proficiency_level: str | None = None
    is_deleted: Optional[bool] = None # <-- ADD THIS

class EmployeeSkillInDB(EmployeeSkillBase):
    pass