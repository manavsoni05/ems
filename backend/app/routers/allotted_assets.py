# TODO: implement later
# backend/app/routers/allotted_assets.py
from fastapi import APIRouter, Depends
from app.dependencies.auth import require_role

router = APIRouter()

@router.get("/", dependencies=[Depends(require_role(["admin"]))])
async def list_allotted_assets():
    # Logic to list all allotted assets
    return {"message": "List of allotted assets"}