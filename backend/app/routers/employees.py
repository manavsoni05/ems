# backend/app/routers/employees.py

from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File, Form
from typing import Any, List, Optional
import shutil
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, date, timedelta
import uuid
import json
from pymongo import DESCENDING # Import DESCENDING for sorting

from app.config import settings
from app.dependencies.auth import get_current_employee, require_role, get_password_hash, require_permission
from app.models.employee import EmployeeBase, EmployeeCreate, EmployeeUpdate
from app.schemas import employee_schema
from pydantic import BaseModel, EmailStr

router = APIRouter(
    tags=["Employees"],
    redirect_slashes=False
)

db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
collection = db.employees
skills_collection = db.employee_skills
payroll_collection = db.payroll
user_notifications_collection = db.user_notifications # <-- ADD THIS

IMAGE_DIR = Path("app/static/images")
IMAGE_DIR.mkdir(parents=True, exist_ok=True)
CERTIFICATES_DIR = Path("app/static/certificates")
CERTIFICATES_DIR.mkdir(parents=True, exist_ok=True)

class Skill(BaseModel):
    skill_name: str
    proficiency_level: str

class EmployeeProfileDetails(BaseModel):
    employee: EmployeeBase
    manager: Optional[EmployeeBase] = None
    direct_reports: List[EmployeeBase] = []

class CertificateDeleteRequest(BaseModel):
    certificate_url: str


@router.post("/{employee_id}/photo", response_model=EmployeeBase, dependencies=[Depends(require_permission("employee:update"))])
async def upload_employee_photo(employee_id: str, file: UploadFile = File(...)):
    employee = await collection.find_one({"employee_id": employee_id, "is_deleted": {"$ne": True}}) # <-- FILTER
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    file_extension = Path(file.filename).suffix
    photo_filename = f"{employee_id}{file_extension}"
    photo_path = IMAGE_DIR / photo_filename

    with photo_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    photo_url = f"/static/images/{photo_filename}"

    await collection.update_one(
        {"employee_id": employee_id},
        {"$set": {"photo_url": photo_url}}
    )

    updated_employee = await collection.find_one({"employee_id": employee_id})
    return updated_employee

@router.post("/{employee_id}/certificate", response_model=EmployeeBase, dependencies=[Depends(require_permission("employee:update"))])
async def upload_employee_certificate(employee_id: str, file: UploadFile = File(...)):
    employee = await collection.find_one({"employee_id": employee_id, "is_deleted": {"$ne": True}}) # <-- FILTER
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    file_extension = Path(file.filename).suffix
    unique_filename = f"{employee_id}_{uuid.uuid4().hex[:8]}{file_extension}"
    certificate_path = CERTIFICATES_DIR / unique_filename

    with certificate_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    certificate_url = f"/static/certificates/{unique_filename}"

    await collection.update_one(
        {"employee_id": employee_id},
        {"$push": {"certificates": certificate_url}}
    )

    updated_employee = await collection.find_one({"employee_id": employee_id})
    return updated_employee

@router.delete("/{employee_id}/certificate", response_model=EmployeeBase, dependencies=[Depends(require_permission("employee:update"))])
async def delete_employee_certificate(employee_id: str, request: CertificateDeleteRequest):
    employee = await collection.find_one({"employee_id": employee_id, "is_deleted": {"$ne": True}}) # <-- FILTER
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    certificate_url = request.certificate_url

    result = await collection.update_one(
        {"employee_id": employee_id},
        {"$pull": {"certificates": certificate_url}}
    )

    if result.modified_count > 0:
        try:
            filename = certificate_url.split('/')[-1]
            file_path = CERTIFICATES_DIR / filename
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Error deleting certificate file: {e}")

    updated_employee = await collection.find_one({"employee_id": employee_id})
    return updated_employee

async def get_next_employee_id():
    # This logic remains fine, it just needs the last *ever* employee
    last_employee = await collection.find_one(sort=[("employee_id", DESCENDING)])
    if not last_employee or not last_employee["employee_id"].startswith("EMP"):
        return "EMP001"

    last_id_num = int(last_employee["employee_id"][3:])
    new_id_num = last_id_num + 1
    return f"EMP{new_id_num:03d}"

@router.post("", status_code=status.HTTP_201_CREATED, response_model=EmployeeBase, dependencies=[Depends(require_permission("employee:create"))])
async def create_employee(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: EmailStr = Form(...),
    password: str = Form(...),
    hire_date: date = Form(...),
    job_title: str = Form(...),
    department: Optional[str] = Form(None),
    role_id: str = Form(...),
    salary: float = Form(...),
    gross_salary: float = Form(...),
    deductions: float = Form(...),
    reports_to: Optional[str] = Form(None),
    skills: List[str] = Form([]),
    photo: Optional[UploadFile] = File(None),
    certificates: List[UploadFile] = File([])
):
    # Check for existing *active* employee
    if await collection.find_one({"email": email, "is_deleted": {"$ne": True}}): # <-- FILTER
        raise HTTPException(status_code=400, detail="Employee with this email already exists")

    new_employee_id = await get_next_employee_id()
    hashed_password = get_password_hash(password)

    parsed_skills = [Skill(**json.loads(s)) for s in skills] if skills else []

    new_employee_data = {
        "first_name": first_name, "last_name": last_name, "email": email,
        "hire_date": datetime.combine(hire_date, datetime.min.time()),
        "job_title": job_title, "department": department, "role_id": role_id, "salary": salary,
        "gross_salary": gross_salary, "deductions": deductions,
        "reports_to": reports_to, "skills": [s.dict() for s in parsed_skills],
        "employee_id": new_employee_id, "hashed_password": hashed_password,
        "photo_url": None, "certificates": [],
        "is_active": True, "is_deleted": False # <-- ADD THIS
    }

    # Handle photo upload
    if photo:
        file_extension = Path(photo.filename).suffix
        photo_filename = f"{new_employee_id}{file_extension}"
        photo_path = IMAGE_DIR / photo_filename
        with photo_path.open("wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        new_employee_data["photo_url"] = f"/static/images/{photo_filename}"

    # Handle certificate uploads
    certificate_urls = []
    for cert_file in certificates:
        file_extension = Path(cert_file.filename).suffix
        unique_filename = f"{new_employee_id}_{uuid.uuid4().hex[:8]}{file_extension}"
        certificate_path = CERTIFICATES_DIR / unique_filename
        with certificate_path.open("wb") as buffer:
            shutil.copyfileobj(cert_file.file, buffer)
        certificate_urls.append(f"/static/certificates/{unique_filename}")
    new_employee_data["certificates"] = certificate_urls

    created_employee = await employee_schema.create_employee(db, new_employee_data)

    # --- NEW: Automatically create initial payroll record ---
    net_salary = gross_salary - deductions
    start_of_month = hire_date.replace(day=1)
    if start_of_month.month == 12:
        end_of_month = start_of_month.replace(year=start_of_month.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end_of_month = start_of_month.replace(month=start_of_month.month + 1, day=1) - timedelta(days=1)


    initial_payroll_doc = {
        "payroll_id": f"PAY-{uuid.uuid4().hex[:8].upper()}",
        "employee_id": new_employee_id,
        "pay_period_start": datetime.combine(start_of_month, datetime.min.time()),
        "pay_period_end": datetime.combine(end_of_month, datetime.min.time()),
        "gross_salary": gross_salary,
        "deductions": deductions,
        "net_salary": net_salary,
        "status": "Generated",
        "is_deleted": False # <-- ADD THIS
    }
    await payroll_collection.insert_one(initial_payroll_doc)
    # --- END NEW LOGIC ---

    # Create skills in the employee_skills collection
    if parsed_skills:
        skill_docs = [
            {
                "employee_skill_id": f"SKL-{uuid.uuid4().hex[:8].upper()}",
                "employee_id": new_employee_id,
                "skill_name": skill.skill_name,
                "proficiency_level": skill.proficiency_level,
                "is_deleted": False # <-- ADD THIS
            }
            for skill in parsed_skills
        ]
        await skills_collection.insert_many(skill_docs)

    return created_employee


@router.put("/{employee_id}", response_model=EmployeeBase, dependencies=[Depends(require_permission("employee:update"))])
async def update_employee(employee_id: str, employee_update: EmployeeUpdate):
    update_data = employee_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    # Fetch the current employee data before update for comparison
    employee = await collection.find_one({"employee_id": employee_id, "is_deleted": {"$ne": True}}) # <-- FILTER
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if "reports_to" in update_data and update_data["reports_to"] is not None:
        if update_data["reports_to"] == employee_id: # Prevent self-reporting
             raise HTTPException(status_code=400, detail="Employee cannot report to themselves.")
        manager = await collection.find_one({"employee_id": update_data["reports_to"], "is_deleted": {"$ne": True}}) # <-- FILTER
        if not manager:
            raise HTTPException(status_code=400, detail="Manager with the provided ID does not exist.")

    # --- Corrected Payroll Update Logic ---
    if "gross_salary" in update_data or "deductions" in update_data:
        new_gross = update_data.get("gross_salary", employee.get("gross_salary", 0)) 
        new_deductions = update_data.get("deductions", employee.get("deductions", 0)) 
        new_net = new_gross - new_deductions

        if new_net < 0:
             raise HTTPException(status_code=400, detail="Update results in negative net salary.")

        latest_payroll_record = await payroll_collection.find_one(
            {"employee_id": employee_id, "is_deleted": {"$ne": True}}, # <-- FILTER
            sort=[("pay_period_end", DESCENDING)] 
        )

        if latest_payroll_record:
            await payroll_collection.update_one(
                {"_id": latest_payroll_record["_id"]}, 
                {"$set": {
                    "gross_salary": new_gross,
                    "deductions": new_deductions,
                    "net_salary": new_net
                }}
            )
    # --- End Corrected Payroll Update Logic ---

    # Update the main employee document
    result = await collection.update_one(
        {"employee_id": employee_id},
        {"$set": update_data}
    )

    updated_employee = await collection.find_one({"employee_id": employee_id})
    if not updated_employee:
         raise HTTPException(status_code=404, detail="Employee not found after update.") 

    return updated_employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("employee:delete"))])
async def delete_employee(employee_id: str):
    # --- SOFT DELETE LOGIC ---
    delete_payload = {"$set": {"is_deleted": True, "is_active": False}}
    
    # Soft delete the employee
    result = await collection.update_one(
        {"employee_id": employee_id},
        delete_payload
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Soft delete associated payroll and skills
    await payroll_collection.update_many({"employee_id": employee_id}, delete_payload)
    await skills_collection.update_many({"employee_id": employee_id}, delete_payload)
    
    # Soft delete performance reviews
    await db.performance_reviews.update_many({"employee_id": employee_id}, delete_payload)
    
    # Soft delete notifications (using 'deleted' flag)
    await user_notifications_collection.update_many(
        {"user_id": employee_id}, 
        {"$set": {"deleted": True}}
    )
    await user_notifications_collection.update_many(
        {"subject_employee_id": employee_id}, 
        {"$set": {"deleted": True}}
    )
    # --- END SOFT DELETE LOGIC ---
    return

@router.put("/{employee_id}/password", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("employee:update"))])
async def change_employee_password(employee_id: str, new_password: str = Body(..., embed=True)):
    hashed_password = get_password_hash(new_password)
    result = await collection.update_one(
        {"employee_id": employee_id, "is_deleted": {"$ne": True}}, # <-- FILTER
        {"$set": {"hashed_password": hashed_password}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return

@router.get("", response_model=List[EmployeeBase], dependencies=[Depends(require_permission("employee:read_all"))])
async def list_employees():
    employees = []
    cursor = collection.find({"is_deleted": {"$ne": True}}) # <-- FILTER
    async for employee in cursor:
        employees.append(employee)
    return employees

@router.get("/me", response_model=EmployeeBase, dependencies=[Depends(require_permission("employee:read_self"))])
async def read_employee_me(current_user: dict[str, Any] = Depends(get_current_employee)):
    # Auth check already uses the non-filtered get_employee_by_id
    # But this endpoint should not return a deleted user
    employee = await collection.find_one(
        {"employee_id": current_user["employee_id"], "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.get("/me/details", response_model=EmployeeProfileDetails, dependencies=[Depends(require_permission("employee:read_self"))]) # <-- UPDATE
async def read_employee_me_details(current_user: dict[str, Any] = Depends(get_current_employee)):
    # Get current user's full profile
    employee_doc = await collection.find_one(
        {"employee_id": current_user["employee_id"], "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not employee_doc:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee = EmployeeBase.model_validate(employee_doc)

    # Get manager's details
    manager = None
    if employee.reports_to:
        manager_doc = await collection.find_one(
            {"employee_id": employee.reports_to, "is_deleted": {"$ne": True}} # <-- FILTER
        )
        if manager_doc:
            manager = EmployeeBase.model_validate(manager_doc)

    # Get direct reports
    direct_reports_cursor = collection.find(
        {"reports_to": current_user["employee_id"], "is_deleted": {"$ne": True}} # <-- FILTER
    )
    direct_reports = [EmployeeBase.model_validate(doc) async for doc in direct_reports_cursor]

    return EmployeeProfileDetails(employee=employee, manager=manager, direct_reports=direct_reports)