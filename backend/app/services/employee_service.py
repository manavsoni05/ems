# backend/app/services/employee_service.py
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.dependencies.auth import get_password_hash
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta
import uuid

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]
collection = db.employees
payroll_collection = db.payroll

async def get_next_employee_id():
    """Generates the next sequential employee ID."""
    last_employee = await collection.find_one(sort=[("employee_id", -1)])
    if not last_employee or not last_employee["employee_id"].startswith("EMP"):
        return "EMP001"
    
    last_id_num = int(last_employee["employee_id"][3:])
    new_id_num = last_id_num + 1
    return f"EMP{new_id_num:03d}"

async def create_employee_service(employee_data: dict):
    if await collection.find_one({"email": employee_data["email"]}):
        raise HTTPException(status_code=400, detail="Employee with this email already exists")

    # Generate the new employee ID
    new_employee_id = await get_next_employee_id()
    employee_data['employee_id'] = new_employee_id

    # Hash the password
    employee_data['hashed_password'] = get_password_hash(employee_data['password'])
    del employee_data['password']
    
    # Add default values for required fields not collected by the AI
    employee_data.setdefault('hire_date', datetime.now(timezone.utc))
    employee_data.setdefault('reports_to', None)
    employee_data.setdefault('certificates', [])
    employee_data.setdefault('photo_url', None)

    # Handle skills
    if 'skills' in employee_data and isinstance(employee_data['skills'], str):
        employee_data['skills'] = [
            {"skill_name": skill.strip(), "proficiency_level": "Beginner"} 
            for skill in employee_data['skills'].split(',')
        ]

    # Insert the new employee
    await collection.insert_one(employee_data)
    
    # Create the initial payroll record, similar to the main endpoint
    hire_date = employee_data['hire_date'].date()
    start_of_month = hire_date.replace(day=1)
    # A more robust way to get the end of the month
    next_month = start_of_month.replace(month=start_of_month.month % 12 + 1, day=1)
    if start_of_month.month == 12:
        next_month = start_of_month.replace(year=start_of_month.year + 1, month=1)
    end_of_month = next_month - timedelta(days=1)

    initial_payroll_doc = {
        "payroll_id": f"PAY-{uuid.uuid4().hex[:8].upper()}",
        "employee_id": new_employee_id,
        "pay_period_start": datetime.combine(start_of_month, datetime.min.time()),
        "pay_period_end": datetime.combine(end_of_month, datetime.min.time()),
        "gross_salary": float(employee_data.get('gross_salary', 0)),
        "deductions": float(employee_data.get('deductions', 0)),
        "net_salary": float(employee_data.get('gross_salary', 0)) - float(employee_data.get('deductions', 0)),
        "status": "Generated"
    }
    await payroll_collection.insert_one(initial_payroll_doc)
    
    return await collection.find_one({"employee_id": new_employee_id})