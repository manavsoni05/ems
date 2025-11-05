# TODO: implement later
# backend/app/routers/reports.py
from fastapi import APIRouter, Depends
from app.dependencies.auth import require_role

router = APIRouter()

@router.post("/generate", dependencies=[Depends(require_role(["admin", "hr"]))])
async def generate_report():
    # Logic to generate and store a report
    return {"message": "Report generated successfully"}