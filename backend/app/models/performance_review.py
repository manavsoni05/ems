from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class PerformanceReviewBase(BaseModel):
    review_id: str = Field(..., description="Primary key")
    employee_id: str = Field(..., description="Foreign key to Employees")
    reviewer_id: str = Field(..., description="Employee ID of the reviewer")
    review_date: date
    rating: int = Field(..., ge=1, le=5)
    comments: str
    is_deleted: bool = Field(default=False) # <-- ADD THIS

class PerformanceReviewCreate(BaseModel):
    employee_id: str
    review_date: date
    rating: int = Field(..., ge=1, le=5)
    comments: str

class PerformanceReviewUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=5)
    comments: str | None = None
    is_deleted: Optional[bool] = None # <-- ADD THIS

class PerformanceReviewInDB(PerformanceReviewBase):
    pass