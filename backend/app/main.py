# backend/app/main.py
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from bson import ObjectId
from datetime import datetime, date
import json

from app.config import settings
from app.init_db import init_database
from app.dependencies.audit import AuditLogMiddleware
from app.routers import (
    auth, # <-- 1. 'roles' is removed from this line
    employees, attendance, leaves, payroll,
    performance_reviews, employee_skills, assets, reports, ai, notifications,
    role_management  # <-- 2. ADD 'role_management'
)

# --- (Serializer, Lifespan, App, and Exception Handler) ---
def custom_json_serializer(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

class CustomJSONResponse(JSONResponse):
    def render(self, content: any) -> bytes:
        return json.dumps(
            content,
            default=custom_json_serializer,
        ).encode("utf-8")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    await init_database()
    yield
    print("Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    default_response_class=CustomJSONResponse
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = []
    for error in exc.errors():
        field = " -> ".join(map(str, error["loc"][1:])) # Get field path (skip "body")
        message = error["msg"]
        # Make messages slightly more direct
        if "value is not a valid" in message:
             message = f"Invalid format for '{field}'."
        elif "ensure this value has at least" in message:
             message = f"'{field}' must have at least {message.split('at least ')[1].split(' characters')[0]} characters."
        elif "Name must contain only letters" in message: # Capture custom validator message
             message = f"Invalid characters in '{field}'. Use only letters and optional spaces/hyphens/apostrophes between letters."
        elif "Password must be at least" in message:
             message = f"'{field}' must be at least 8 characters long."
        elif "Deductions cannot be greater than Gross Salary" in message:
            message = "Deductions cannot be greater than Gross Salary."
        elif "cannot be negative" in message:
            message = f"'{field}' cannot be negative."

        error_details.append({"field": field, "message": message})

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST, # Use 400 for bad client input
        content={"detail": error_details},
    )
# --- (End of unchanged section) ---


app.mount("/static", StaticFiles(directory="app/static"), name="static")

origins = [
    "http://localhost:5173", # Allow frontend origin
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"], 
)

app.add_middleware(AuditLogMiddleware)

# --- 3. INCLUDE THE NEW ROUTER AND REMOVE THE OLD ONE ---
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(ai.router, prefix="/ai", tags=["AI Assistant"])
# app.include_router(roles.router, prefix="/roles", tags=["Roles"]) # <-- THIS IS NOW GONE
app.include_router(role_management.router, prefix="/roles", tags=["Role Management"]) # <-- THIS IS THE NEW ONE
app.include_router(employees.router, prefix="/employees", tags=["Employees"])
app.include_router(leaves.router, prefix="/leaves", tags=["Leaves"])
app.include_router(assets.router, prefix="/assets", tags=["Assets"])
app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
app.include_router(payroll.router, prefix="/payroll", tags=["Payroll"])
app.include_router(performance_reviews.router, prefix="/performance-reviews", tags=["Performance Reviews"])
app.include_router(employee_skills.router, prefix="/employee-skills", tags=["Employee Skills"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])


@app.get("/")
def read_root():
    return {"message": "Welcome to the Employee Management System API"}