# backend/app/models/payroll.py
from pydantic import BaseModel, Field
from datetime import date

class PayrollBase(BaseModel):
    payroll_id: str = Field(..., description="Primary key")
    employee_id: str
    pay_period_start: date
    pay_period_end: date
    gross_salary: float
    deductions: float
    net_salary: float
    status: str
    is_deleted: bool = Field(default=False) # <-- ADD THIS

class PayrollGenerate(BaseModel):
    employee_id: str
    pay_period_start: date
    pay_period_end: date
    gross_salary: float
    deductions: float

class PayrollUpdate(BaseModel):
    gross_salary: float | None = None
    deductions: float | None = None
    status: str | None = None
    pay_period_start: date | None = None
    pay_period_end: date | None = None
    is_deleted: bool | None = None # <-- ADD THIS

class PayrollInDB(PayrollBase):
    pass