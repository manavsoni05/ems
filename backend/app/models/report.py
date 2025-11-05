# TODO: implement later
# backend/app/models/report.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any

class ReportBase(BaseModel):
    report_id: str = Field(..., description="Primary key")
    report_name: str
    generated_by: str = Field(..., description="Employee ID of generator")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    parameters: Dict[str, Any]
    data: Any # Can be a list of dicts, a summary dict, etc.

class ReportCreate(ReportBase):
    pass

class ReportInDB(ReportBase):
    pass