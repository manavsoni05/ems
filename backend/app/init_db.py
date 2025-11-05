# backend/app/init_db.py

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from .config import settings
from .schemas import (
    role_schema, employee_schema, attendance_schema, leave_schema,
    payroll_schema, performance_schema, employee_skill_schema,
    asset_schema, allotted_asset_schema, report_schema, audit_schema,
    user_notification_schema,
    ai_conversation_schema,
    permission_schema  # <-- 1. ADD THIS IMPORT
)
from datetime import datetime, date, timezone, timedelta 
import uuid 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_database():
    client = AsyncIOMotorClient(settings.MONGO_URI) 
    db = client[settings.MONGO_DB_NAME] 

    all_schemas = [
        role_schema, employee_schema, attendance_schema, leave_schema,
        payroll_schema, performance_schema, employee_skill_schema,
        asset_schema, allotted_asset_schema, report_schema, audit_schema,
        user_notification_schema,
        ai_conversation_schema,
        permission_schema  # <-- 2. ADD THIS TO THE LIST
    ] 

    print("Starting database index creation...")
    for schema in all_schemas: 
        if hasattr(schema, 'create_indexes') and callable(schema.create_indexes) and hasattr(schema, 'COLLECTION'): 
            try:
                print(f"Creating/ensuring indexes for collection: '{schema.COLLECTION}'...") 
                await schema.create_indexes(db) 
            except Exception as e:
                print(f"Error creating indexes for '{schema.COLLECTION}': {e}") 
        else:
            schema_name = getattr(schema, '__name__', str(schema)) 
            print(f"Skipping index creation for {schema_name} (missing create_indexes method or COLLECTION attribute).") 

    print("Database index creation process completed.") 

    # --- Seeding Initial Data ---

    # 3. ADD NEW PERMISSIONS SEEDING BLOCK
    if await db.permissions.count_documents({}) == 0:
        print("Seeding initial permissions...")
        permissions_to_create = [
            # Employee Permissions
            {"permission_key": "employee:create", "description": "Can create new employees"},
            {"permission_key": "employee:read_all", "description": "Can view all employee profiles"},
            {"permission_key": "employee:read_self", "description": "Can view their own profile"},
            {"permission_key": "employee:update", "description": "Can update employee information"},
            {"permission_key": "employee:delete", "description": "Can delete employees"},
            # Leave Permissions
            {"permission_key": "leave:create_self", "description": "Can request leave for self"},
            {"permission_key": "leave:create_all", "description": "Can create leave for any employee"},
            {"permission_key": "leave:read_all", "description": "Can view all leave requests"},
            {"permission_key": "leave:read_self", "description": "Can view their own leave requests"},
            {"permission_key": "leave:approve", "description": "Can approve or reject leave requests"},
            # Payroll Permissions
            {"permission_key": "payroll:create", "description": "Can generate payroll slips"},
            {"permission_key": "payroll:read_all", "description": "Can view all payroll records"},
            {"permission_key": "payroll:read_self", "description": "Can view their own payroll slips"},
            {"permission_key": "payroll:update", "description": "Can update payroll records"},
            # Asset Permissions
            {"permission_key": "asset:create", "description": "Can create new assets"},
            {"permission_key": "asset:read_all", "description": "Can view all assets"},
            {"permission_key": "asset:read_self", "description": "Can view their own assigned assets"},
            {"permission_key": "asset:allot", "description": "Can allot assets to employees"},
            {"permission_key": "asset:reclaim", "description": "Can reclaim assets from employees"},
            {"permission_key": "asset:delete", "description": "Can delete assets"},
            # Performance Permissions
            {"permission_key": "performance:create", "description": "Can create performance reviews"},
            {"permission_key": "performance:read_all", "description": "Can view all performance reviews"},
            {"permission_key": "performance:read_self", "description": "Can view their own performance reviews"},
            {"permission_key": "performance:update", "description": "Can update performance reviews"},
            {"permission_key": "performance:delete", "description": "Can delete performance reviews"},
            # Skill Permissions
            {"permission_key": "skill:create", "description": "Can add skills to employees"},
            {"permission_key": "skill:read_all", "description": "Can view all employee skills"},
            {"permission_key": "skill:read_self", "description": "Can view their own skills"},
            {"permission_key": "skill:update", "description": "Can update employee skills"},
            {"permission_key": "skill:delete", "description": "Can delete employee skills"},
            # Admin/Role Permissions
            {"permission_key": "role:manage", "description": "Can create, edit, and delete roles"},
        ]
        await db.permissions.insert_many(permissions_to_create)
        print(f"{len(permissions_to_create)} permissions seeded.")
    else:
        print("Permissions collection not empty, skipping seeding.")

    if await db.roles.count_documents({}) == 0: 
        print("Seeding initial roles...")
        # 4. UPDATE ROLES TO USE NEW PERMISSION KEYS
        admin_permissions = [p["permission_key"] async for p in db.permissions.find()]
        hr_permissions = [
            "employee:create", "employee:read_all", "employee:update",
            "leave:create_all", "leave:read_all", "leave:approve",
            "payroll:create", "payroll:read_all", "payroll:update",
            "asset:create", "asset:read_all", "asset:allot", "asset:reclaim",
            "performance:create", "performance:read_all", "performance:update", "performance:delete",
            "skill:create", "skill:read_all", "skill:update", "skill:delete"
        ]
        employee_permissions = [
            "employee:read_self", "leave:create_self", "leave:read_self",
            "payroll:read_self", "asset:read_self", "performance:read_self",
            "skill:read_self"
        ]
        
        roles_to_create = [ 
            {"role_id": "admin", "role_name": "Administrator", "permission_keys": admin_permissions, "is_deleted": False}, 
            {"role_id": "hr", "role_name": "Human Resources", "permission_keys": hr_permissions, "is_deleted": False}, 
            {"role_id": "employee", "role_name": "Employee", "permission_keys": employee_permissions, "is_deleted": False}, 
        ]
        await db.roles.insert_many(roles_to_create) 
        print("Roles seeded with permission keys.") 
    else:
        print("Roles collection not empty, skipping seeding.") 

    # ... (rest of the employee/asset seeding remains the same) ...
    # (Seeding of employees and assets)
    if await db.employees.count_documents({}) == 0: 
        print("Seeding initial employees...") 
        hashed_password = pwd_context.hash("password123") 
        utc_now = datetime.now(timezone.utc) 
        employees_to_create = [ 
            { 
                "employee_id": "EMP001", "first_name": "Admin", "last_name": "User", 
                "email": "admin@example.com", "role_id": "admin", "hashed_password": hashed_password, 
                "hire_date": utc_now - timedelta(days=300), 
                "job_title": "System Administrator", "department": "IT", "reports_to": None, 
                "skills": [{"skill_name": "Python", "proficiency_level": "Expert"}, {"skill_name": "MongoDB", "proficiency_level": "Intermediate"}], 
                "certificates": [], "photo_url": "/static/images/EMP001.JPG", 
                "salary": 70000, "gross_salary": 85000, "deductions": 5000,
                "is_active": True, "is_deleted": False
            },
            { 
                "employee_id": "EMP002", "first_name": "HR", "last_name": "Manager", 
                "email": "hr@example.com", "role_id": "hr", "hashed_password": hashed_password, 
                "hire_date": utc_now - timedelta(days=200), 
                "job_title": "HR Manager", "department": "Human Resources", "reports_to": "EMP001", 
                "skills": [{"skill_name": "Recruitment", "proficiency_level": "Expert"}], 
                "certificates": [], "photo_url": "/static/images/EMP002.JPG", 
                "salary": 65000, "gross_salary": 75000, "deductions": 4500,
                "is_active": True, "is_deleted": False
            },
            { 
                "employee_id": "EMP003", "first_name": "John", "last_name": "Doe", 
                "email": "john.doe@example.com", "role_id": "employee", "hashed_password": hashed_password, 
                "hire_date": utc_now - timedelta(days=100), 
                "job_title": "Software Engineer", "department": "Engineering", "reports_to": "EMP001", 
                "skills": [{"skill_name": "JavaScript", "proficiency_level": "Intermediate"}, {"skill_name": "React", "proficiency_level": "Beginner"}], 
                "certificates": [], "photo_url": "/static/images/EMP003.jpg", 
                "salary": 55000, "gross_salary": 65000, "deductions": 4000,
                "is_active": True, "is_deleted": False
            },
        ]
        await db.employees.insert_many(employees_to_create) 
        print(f"{len(employees_to_create)} Employees seeded.") 

        print("Seeding initial payroll records...") 
        for emp in employees_to_create: 
             hire_dt = emp['hire_date'] 
             start_of_month = hire_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0) 
             if start_of_month.month == 12: 
                 next_month_start = start_of_month.replace(year=start_of_month.year + 1, month=1, day=1) 
             else:
                 next_month_start = start_of_month.replace(month=start_of_month.month + 1, day=1) 
             end_of_month = next_month_start - timedelta(microseconds=1) 

             initial_payroll_doc = { 
                 "payroll_id": f"PAY-{uuid.uuid4().hex[:8].upper()}", 
                 "employee_id": emp["employee_id"], 
                 "pay_period_start": start_of_month, 
                 "pay_period_end": end_of_month, 
                 "gross_salary": emp.get("gross_salary", 0), 
                 "deductions": emp.get("deductions", 0), 
                 "net_salary": emp.get("gross_salary", 0) - emp.get("deductions", 0), 
                 "status": "Generated",
                 "is_deleted": False
             }
             await db.payroll.insert_one(initial_payroll_doc) 
        print("Initial payroll seeded.") 

    else:
        print("Employees collection not empty, skipping seeding.") 

    if await db.assets.count_documents({}) == 0: 
        print("Seeding initial assets...") 
        assets_to_create = [ 
            {"asset_id": "AST-LAP001", "asset_name": "Dell XPS 15", "asset_type": "Laptop", "serial_number": "DXPS15-A001", "purchase_date": datetime(2024, 1, 15, tzinfo=timezone.utc), "status": "Available", "is_deleted": False},
            {"asset_id": "AST-LAP002", "asset_name": "MacBook Pro 16", "asset_type": "Laptop", "serial_number": "MBP16-B002", "purchase_date": datetime(2024, 2, 20, tzinfo=timezone.utc), "status": "Available", "is_deleted": False},
            {"asset_id": "AST-MON001", "asset_name": "Dell UltraSharp 27", "asset_type": "Monitor", "serial_number": "DUM27-C003", "purchase_date": datetime(2024, 3, 10, tzinfo=timezone.utc), "status": "Available", "is_deleted": False},
        ]
        await db.assets.insert_many(assets_to_create) 
        print(f"{len(assets_to_create)} Assets seeded.") 
    else:
        print("Assets collection not empty, skipping seeding.") 

    print("Database initialization complete.")