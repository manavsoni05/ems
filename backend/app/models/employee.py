# backend/app/models/employee.py

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, validator
from datetime import date, datetime
from typing import Optional, List
from .pyobjectid import PyObjectId
import re # Import the regular expression module

class Skill(BaseModel):
    skill_name: str
    proficiency_level: str

class EmployeeBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    employee_id: str = Field(..., description="Primary key, unique employee identifier")
    # Apply constraints directly
    first_name: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z]+(?:[\s'-][a-zA-Z]+)*$")
    last_name: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z]+(?:[\s'-][a-zA-Z]+)*$")
    email: EmailStr
    phone_number: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$") # Optional: Basic E.164 phone format
    hire_date: datetime
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    role_id: str = Field(..., description="Foreign key referencing the Roles collection")
    reports_to: Optional[str] = Field(None, description="Employee ID of the manager")
    photo_url: Optional[str] = None
    salary: Optional[float] = Field(None, ge=0) # Ensure non-negative salary
    skills: Optional[List[Skill]] = []
    certificates: Optional[List[str]] = []
    is_active: bool = True
    is_deleted: bool = Field(default=False)

    # --- Refined Validator for Names ---
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_name_format(cls, v: str) -> str:
        # Allows letters, spaces, hyphens, apostrophes (common in names)
        # Rejects names that start/end with space/hyphen/apostrophe or contain consecutive ones
        if not re.match(r"^[a-zA-Z]+(?:[' -][a-zA-Z]+)*$", v):
            raise ValueError('Name must contain only letters and optionally spaces, hyphens, or apostrophes between letters.')
        if len(v) < 2:
             raise ValueError('Name must be at least 2 characters long.')
        return v.strip() # Trim leading/trailing whitespace

    # --- Optional: Add a validator for phone number if needed ---
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Example: Basic validation for digits, +, -, spaces (adjust regex as needed)
        if not re.match(r"^\+?[\d\s-]{7,20}$", v):
             raise ValueError('Invalid phone number format.')
        # You could add more complex phone number validation library here if needed
        return v

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str},
    )

class EmployeeCreate(BaseModel):
    # Inherit constraints and add specific ones like password
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8) # Add min length for password
    hire_date: date
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    role_id: str
    reports_to: Optional[str] = None
    salary: Optional[float] = Field(None, ge=0)
    # Add gross_salary and deductions if they are part of creation via form
    gross_salary: Optional[float] = Field(None, ge=0)
    deductions: Optional[float] = Field(None, ge=0)
    skills: Optional[List[Skill]] = []
    certificates: Optional[List[str]] = [] # Note: Certificates handled as files in router
    

    # --- Reuse the same name validator from EmployeeBase ---
    # Pydantic v2 automatically reuses validators from inherited fields
    # If you needed specific logic ONLY for EmployeeCreate, you'd add validators here.
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_create_name_format(cls, v: str) -> str:
        # Allows letters, spaces, hyphens, apostrophes (common in names)
        # Rejects names that start/end with space/hyphen/apostrophe or contain consecutive ones
        if not re.match(r"^[a-zA-Z]+(?:[' -][a-zA-Z]+)*$", v):
            raise ValueError('Name must contain only letters and optionally spaces, hyphens, or apostrophes between letters.')
        if len(v) < 2:
             raise ValueError('Name must be at least 2 characters long.')
        return v.strip() # Trim leading/trailing whitespace

    # --- Add password complexity validation if desired ---
    @field_validator('password')
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long.')
        # Add more rules (e.g., uppercase, lowercase, number, symbol) if needed using regex
        # if not re.search(r"[A-Z]", v): raise ValueError('Password needs an uppercase letter.')
        # if not re.search(r"[a-z]", v): raise ValueError('Password needs a lowercase letter.')
        # if not re.search(r"\d", v): raise ValueError('Password needs a digit.')
        # if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v): raise ValueError('Password needs a special character.')
        return v

    # --- Ensure Gross Salary >= Deductions if both provided ---
    @validator('deductions') # Using older validator style for cross-field validation
    def check_deductions_vs_gross(cls, deductions_value, values):
        gross_salary_value = values.get('gross_salary')
        if deductions_value is not None and gross_salary_value is not None:
            if deductions_value > gross_salary_value:
                raise ValueError('Deductions cannot be greater than Gross Salary.')
            if deductions_value < 0:
                 raise ValueError('Deductions cannot be negative.')
        return deductions_value

    @validator('gross_salary') # Check non-negative gross salary
    def check_gross_salary_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError('Gross Salary cannot be negative.')
        return v

    # --- ADD VALIDATOR FOR reports_to ---
    @field_validator('reports_to')
    @classmethod
    def validate_reports_to(cls, v: Optional[str]) -> Optional[str]:
        if v == "":
            return None # Convert empty string to None
        return v
    # --- END ADD ---


class EmployeeUpdate(BaseModel):
    # Apply constraints here too for updates
    first_name: Optional[str] = Field(None, min_length=2, max_length=50)
    last_name: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    role_id: Optional[str] = None
    reports_to: Optional[str] = None
    salary: Optional[float] = Field(None, ge=0)
    gross_salary: Optional[float] = Field(None, ge=0) # Add if updatable
    deductions: Optional[float] = Field(None, ge=0)   # Add if updatable
    skills: Optional[List[Skill]] = None
    certificates: Optional[List[str]] = None # Handled separately via file endpoints
    is_active: Optional[bool] = None
    is_deleted: Optional[bool] = None

    # --- Reuse validators for names ---
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_update_name_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^[a-zA-Z]+(?:[' -][a-zA-Z]+)*$", v):
            raise ValueError('Name must contain only letters and optionally spaces, hyphens, or apostrophes between letters.')
        if len(v) < 2:
             raise ValueError('Name must be at least 2 characters long.')
        return v.strip()

    # --- ADD VALIDATOR FOR reports_to ---
    @field_validator('reports_to')
    @classmethod
    def validate_reports_to(cls, v: Optional[str]) -> Optional[str]:
        if v == "":
            return None # Convert empty string to None
        return v
    # --- END ADD ---

class EmployeeInDB(EmployeeBase):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    employee_id: str
    role_id: str