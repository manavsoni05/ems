# backend/app/services/intent_router.py
import random
import re
import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone
# Make sure all necessary services and models are imported
from app.services import ai_service, leave_service, asset_service, employee_service
from app.models.leave import LeaveStatusEnum, LeaveTypeEnum
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.routers import attendance
from pymongo import ReturnDocument

# Database connection
client = AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]
conversations_collection = db.ai_conversations
employees_collection = db.employees
leaves_collection = db.leaves
assets_collection = db.assets


# --- DB Helper Functions (get_or_create_conversation_state, save_conversation_state, delete_conversation_state) ---
# (Keep these as they were in the previous correct version)
async def get_or_create_conversation_state(conversation_id: str) -> Optional[Dict[str, Any]]:
    """Fetches conversation state or returns None if not found."""
    now = datetime.now(timezone.utc)
    state = await conversations_collection.find_one_and_update(
        {"conversation_id": conversation_id},
        {"$set": {"last_updated": now}},
        return_document=ReturnDocument.AFTER
    )
    return state

async def save_conversation_state(conversation_id: str, state_data: Dict[str, Any]):
    """Saves or updates conversation state in MongoDB."""
    now = datetime.now(timezone.utc)
    state_data["last_updated"] = now
    await conversations_collection.update_one(
        {"conversation_id": conversation_id},
        {"$set": state_data},
        upsert=True
    )

async def delete_conversation_state(conversation_id: str):
    """Deletes a conversation state document."""
    await conversations_collection.delete_one({"conversation_id": conversation_id})

# --- _get_employee_by_identifier Helper Function ---
# (Keep as is)
async def _get_employee_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
    # ... (implementation remains the same) ...
    if re.match(r'^EMP\d+$', identifier, re.IGNORECASE):
        return await employees_collection.find_one({"employee_id": identifier.upper()}, {"_id": 0, "hashed_password": 0})
    name_parts = identifier.split()
    if len(name_parts) >= 2:
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:])
        employee = await employees_collection.find_one(
            {"first_name": {"$regex": f"^{first_name}$", "$options": "i"}, "last_name": {"$regex": f"^{last_name}$", "$options": "i"}},
            {"_id": 0, "hashed_password": 0}
        )
        if employee: return employee
    employee = await employees_collection.find_one(
        {"$or": [
            {"first_name": {"$regex": f"^{identifier}$", "$options": "i"}},
            {"last_name": {"$regex": f"^{identifier}$", "$options": "i"}}
        ]},
        {"_id": 0, "hashed_password": 0}
    )
    return employee


# --- handle_create_employee_flow ---
# (Keep as is)
async def handle_create_employee_flow(command: str, conversation_id: str, state: Dict[str, Any]) -> Dict[str, Any]:
    # ... (implementation remains the same) ...
    field_to_collect = state["next_question"]
    state["collected_data"][field_to_collect] = command
    next_q = None
    message = ""
    if "first_name" not in state["collected_data"]: next_q, message = "first_name", "What is the employee's first name?"
    elif "last_name" not in state["collected_data"]: next_q, message = "last_name", f"Got it. What is {state['collected_data']['first_name']}'s last name?"
    elif "email" not in state["collected_data"]: next_q, message = "email", "Thanks. What is their email address?"
    elif "job_title" not in state["collected_data"]: next_q, message = "job_title", "What is their job title?"
    elif "department" not in state["collected_data"]: next_q, message = "department", "Which department will they be in?"
    elif "salary" not in state["collected_data"]: next_q, message = "salary", "What is their base salary?"
    elif "gross_salary" not in state["collected_data"]: next_q, message = "gross_salary", "What is their gross salary?"
    elif "deductions" not in state["collected_data"]: next_q, message = "deductions", "What are their deductions?"
    elif "role_id" not in state["collected_data"]: next_q, message = "role_id", "What role should they have? (e.g., employee, hr)"
    elif "password" not in state["collected_data"]: next_q, message = "password", "Great. Please provide a temporary password for them."
    elif "skills" not in state["collected_data"]: next_q, message = "skills", "What skills do they have? (comma-separated, optional - type 'skip' if none)"
    else:
        if state["collected_data"].get("skills", "").lower() == 'skip': state["collected_data"]["skills"] = ""
        try:
            employee_data = state["collected_data"]
            created_employee = await employee_service.create_employee_service(employee_data)
            await delete_conversation_state(conversation_id)
            new_id = created_employee['employee_id']
            return {"message": f"All done! I've created the employee profile for {employee_data['first_name']} {employee_data['last_name']} with the new ID: {new_id}."}
        except Exception as e:
            await delete_conversation_state(conversation_id)
            error_detail = getattr(e, 'detail', str(e))
            return {"message": f"I had trouble creating the employee. The error was: {error_detail}"}
    if next_q and message:
        state["next_question"] = next_q
        await save_conversation_state(conversation_id, state)
        return {"message": message}
    else:
         await delete_conversation_state(conversation_id)
         return {"message": "Something went wrong collecting employee details. Please start again."}


# --- UPDATED: handle_create_leave_request_flow ---
async def handle_create_leave_request_flow(command: str, conversation_id: str, state: Dict[str, Any]) -> Dict[str, Any]:
    """Handles the multi-step conversation for creating a leave request."""

    # --- Step 1: Re-parse the user's latest command to extract parameters ---
    intent_data = await ai_service.get_intent_from_groq(command)
    extracted_params = intent_data.get("parameters", {})

    # --- Step 2: Update collected_data with newly extracted params ---
    # Only update if the AI extracted a value for that specific parameter
    if "start_date" in extracted_params and extracted_params["start_date"]:
        state["collected_data"]["start_date"] = extracted_params["start_date"]
    if "end_date" in extracted_params and extracted_params["end_date"]:
        state["collected_data"]["end_date"] = extracted_params["end_date"]
    if "reason" in extracted_params and extracted_params["reason"]:
        state["collected_data"]["reason"] = extracted_params["reason"]
    if "leave_type" in extracted_params and extracted_params["leave_type"]:
        state["collected_data"]["leave_type"] = extracted_params["leave_type"]

    # --- Step 3: Check for missing fields again ---
    required_fields = ["start_date", "end_date", "reason", "leave_type"]
    missing_fields = [f for f in required_fields if f not in state["collected_data"] or not state["collected_data"][f]]

    if not missing_fields:
        # --- Step 4a: All data collected, execute the action ---
        try:
            leave_data = state["collected_data"]
            # Validate leave type
            try:
                type_map = { # More robust mapping
                    "sick": LeaveTypeEnum.sick, "sickness": LeaveTypeEnum.sick, "ill": LeaveTypeEnum.sick,
                    "vacation": LeaveTypeEnum.vacation, "holiday": LeaveTypeEnum.vacation, "annual": LeaveTypeEnum.vacation,
                    "wfh": LeaveTypeEnum.wfh, "work from home": LeaveTypeEnum.wfh, "remote": LeaveTypeEnum.wfh,
                    "personal": LeaveTypeEnum.personal, "personal leave": LeaveTypeEnum.personal
                }
                leave_type_input = leave_data["leave_type"].lower().strip()
                leave_type_val = type_map.get(leave_type_input, LeaveTypeEnum.personal).value # Default to personal if unknown
            except Exception:
                 leave_type_val = LeaveTypeEnum.personal.value # Default if mapping fails

            # Basic Date validation - Ensure AI gives parseable dates
            start_date_val = leave_data["start_date"]
            end_date_val = leave_data["end_date"]
            try:
                 datetime.fromisoformat(start_date_val.replace('Z', '+00:00'))
                 datetime.fromisoformat(end_date_val.replace('Z', '+00:00'))
            except ValueError:
                 # If dates are invalid, clear them and ask again
                 state["collected_data"].pop("start_date", None)
                 state["collected_data"].pop("end_date", None)
                 missing_fields = ["start_date", "end_date"] + [f for f in ["reason", "leave_type"] if f not in state["collected_data"] or not state["collected_data"][f]]
                 next_missing = missing_fields[0]
                 state["next_question"] = next_missing
                 await save_conversation_state(conversation_id, state)
                 missing_list_str = ", ".join([f.replace('_', ' ') for f in missing_fields])
                 return {"message": f"The dates provided seem invalid. Please provide the start and end dates again (YYYY-MM-DD). I'm still missing: {missing_list_str}."}

            # Call the service
            await leave_service.create_leave_request_service(
                employee_id=state["user_employee_id"], # Get user ID from state
                reason=leave_data["reason"],
                start_date_str=start_date_val,
                end_date_str=end_date_val,
                leave_type_str=leave_type_val
            )
            await delete_conversation_state(conversation_id) # End conversation
            return {"message": f"Okay, I've submitted the {leave_type_val} leave request from {start_date_val} to {end_date_val}."}
        except Exception as e:
            await delete_conversation_state(conversation_id) # End conversation on error
            error_detail = getattr(e, 'detail', str(e))
            return {"message": f"I had trouble submitting the leave request. The error was: {error_detail}"}
    else:
        # --- Step 4b: Ask for the next missing field ---
        next_missing = missing_fields[0]
        state["next_question"] = next_missing
        await save_conversation_state(conversation_id, state)
        # Construct a clearer prompt showing what's still needed
        missing_list_str = ", ".join([f.replace('_', ' ') for f in missing_fields])
        return {"message": f"To submit a leave request, I'm missing: {missing_list_str}."}


# --- handle_ai_command (No changes needed from previous version) ---
async def handle_ai_command(command: str, conversation_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
    """Manages the conversation state and routes intents using MongoDB."""
    state = await get_or_create_conversation_state(conversation_id)

    intent_data = await ai_service.get_intent_from_groq(command)
    intent = intent_data.get("intent", "UNKNOWN")
    parameters = intent_data.get("parameters", {})

    # Universal command to cancel any flow
    if intent == "CANCEL_FLOW":
        if state:
            await delete_conversation_state(conversation_id)
        return {"message": "Okay, I've cancelled that. What would you like to do next?"}

    # If we are in an active conversation flow
    if state and state.get("active_flow"):
        flow = state["active_flow"]
        if flow == "CREATE_EMPLOYEE":
            return await handle_create_employee_flow(command, conversation_id, state)
        elif flow == "CREATE_LEAVE_REQUEST": # Uses the updated handler
            return await handle_create_leave_request_flow(command, conversation_id, state)
        elif flow == "APPROVE_LEAVE_REQUEST":
             leave_id_to_approve = command.strip().upper()
             if re.match(r'^LVE-[A-F0-9]{8}$', leave_id_to_approve):
                 state["collected_data"]["leave_id"] = leave_id_to_approve
                 try:
                     await leave_service.update_leave_status_service(leave_id_to_approve, LeaveStatusEnum.approved, current_user["employee_id"])
                     await delete_conversation_state(conversation_id)
                     return {"message": f"Okay, I've approved leave request {leave_id_to_approve}."}
                 except Exception as e:
                     await delete_conversation_state(conversation_id)
                     return {"message": f"Sorry, I couldn't approve that leave request. Reason: {getattr(e, 'detail', str(e))}"}
             else:
                 await save_conversation_state(conversation_id, state)
                 return {"message": f"That doesn't look like a valid Leave ID (e.g., LVE-XXXXXXXX). Please provide the correct ID or say 'cancel'."}

        elif flow == "REJECT_LEAVE_REQUEST":
            if state["next_question"] == "leave_id":
                 leave_id_to_reject = command.strip().upper()
                 if re.match(r'^LVE-[A-F0-9]{8}$', leave_id_to_reject):
                     leave_request = await leaves_collection.find_one({"leave_id": leave_id_to_reject})
                     if not leave_request:
                         await delete_conversation_state(conversation_id)
                         return {"message": f"Sorry, I couldn't find a leave request with ID {leave_id_to_reject}. Please check the ID and try again."}
                     elif leave_request.get("status") != LeaveStatusEnum.pending.value:
                          await delete_conversation_state(conversation_id)
                          return {"message": f"Leave request {leave_id_to_reject} is already '{leave_request.get('status')}'. I can only reject pending requests."}

                     state["collected_data"]["leave_id"] = leave_id_to_reject
                     state["next_question"] = "rejection_reason"
                     await save_conversation_state(conversation_id, state)
                     return {"message": "Okay, please provide a brief reason for rejecting this leave request."}
                 else:
                     await save_conversation_state(conversation_id, state)
                     return {"message": f"That doesn't look like a valid Leave ID (e.g., LVE-XXXXXXXX). Please provide the correct ID or say 'cancel'."}
            elif state["next_question"] == "rejection_reason":
                 rejection_reason = command.strip()
                 leave_id = state["collected_data"]["leave_id"]
                 try:
                     await leave_service.update_leave_status_service(leave_id, LeaveStatusEnum.rejected, current_user["employee_id"], rejection_reason)
                     await delete_conversation_state(conversation_id)
                     return {"message": f"Okay, I've rejected leave request {leave_id} with the reason: '{rejection_reason}'."}
                 except Exception as e:
                     await delete_conversation_state(conversation_id)
                     return {"message": f"Sorry, I couldn't reject that leave request. Reason: {getattr(e, 'detail', str(e))}"}

    # --- Check for intents that START a flow ---
    # (CREATE_EMPLOYEE, APPROVE_LEAVE_REQUEST, REJECT_LEAVE_REQUEST logic remains the same)
    if intent == "CREATE_EMPLOYEE":
        if current_user.get("role_id") != "admin":
            return {"message": "Sorry, you don't have permission to create employees."}
        new_state = { "conversation_id": conversation_id, "user_employee_id": current_user["employee_id"], "active_flow": "CREATE_EMPLOYEE", "collected_data": {}, "next_question": "first_name", "last_updated": datetime.now(timezone.utc) }
        await save_conversation_state(conversation_id, new_state)
        return {"message": "Great! Let's create a new employee. What's their first name?"}

    elif intent == "CREATE_LEAVE_REQUEST":
        target_employee_id = parameters.get("employee_id", "self")
        if target_employee_id == "self": target_employee_id = current_user["employee_id"]
        elif current_user.get("role_id") not in ["admin", "hr"]: return {"message": "You can only request leave for others if you are an admin or HR."}

        required_params = ["start_date", "end_date", "reason", "leave_type"]
        if all(param in parameters and parameters[param] for param in required_params):
             return await route_intent(intent, parameters, current_user) # All info present, treat as one-shot
        else:
             missing_fields = [f for f in required_params if f not in parameters or not parameters[f]]
             next_missing = missing_fields[0] if missing_fields else "start_date"
             collected_data = {k: v for k, v in parameters.items() if k in required_params and v}

             new_state = { "conversation_id": conversation_id, "user_employee_id": target_employee_id, "active_flow": "CREATE_LEAVE_REQUEST", "collected_data": collected_data, "next_question": next_missing, "last_updated": datetime.now(timezone.utc) }
             await save_conversation_state(conversation_id, new_state)
             missing_list_str = ", ".join([f.replace('_', ' ') for f in missing_fields])
             return {"message": f"Okay, let's submit a leave request. I'm missing: {missing_list_str}."}

    elif intent == "APPROVE_LEAVE_REQUEST":
         if current_user.get("role_id") not in ["admin", "hr"]: return {"message": "Sorry, you don't have permission to approve leave requests."}
         leave_id = parameters.get("leave_id")
         if leave_id:
             try:
                 leave_request = await leaves_collection.find_one({"leave_id": leave_id.upper()})
                 if not leave_request: return {"message": f"I couldn't find a leave request with ID {leave_id}. Please check the ID."}
                 if leave_request.get("status") != LeaveStatusEnum.pending.value: return {"message": f"Leave request {leave_id} is already '{leave_request.get('status')}'. I can only approve pending requests."}
                 await leave_service.update_leave_status_service(leave_id.upper(), LeaveStatusEnum.approved, current_user["employee_id"])
                 return {"message": f"Okay, I've approved leave request {leave_id.upper()}."}
             except Exception as e: return {"message": f"Sorry, I couldn't approve that leave request. Reason: {getattr(e, 'detail', str(e))}"}
         else:
             new_state = { "conversation_id": conversation_id, "user_employee_id": current_user["employee_id"], "active_flow": "APPROVE_LEAVE_REQUEST", "collected_data": {}, "next_question": "leave_id", "last_updated": datetime.now(timezone.utc) }
             await save_conversation_state(conversation_id, new_state)
             return {"message": "Okay, which leave request ID would you like to approve?"}

    elif intent == "REJECT_LEAVE_REQUEST":
         if current_user.get("role_id") not in ["admin", "hr"]: return {"message": "Sorry, you don't have permission to reject leave requests."}
         leave_id = parameters.get("leave_id")
         if leave_id:
             leave_request = await leaves_collection.find_one({"leave_id": leave_id.upper()})
             if not leave_request: return {"message": f"I couldn't find a leave request with ID {leave_id}. Please check the ID."}
             if leave_request.get("status") != LeaveStatusEnum.pending.value: return {"message": f"Leave request {leave_id} is already '{leave_request.get('status')}'. I can only reject pending requests."}
             new_state = { "conversation_id": conversation_id, "user_employee_id": current_user["employee_id"], "active_flow": "REJECT_LEAVE_REQUEST", "collected_data": {"leave_id": leave_id.upper()}, "next_question": "rejection_reason", "last_updated": datetime.now(timezone.utc) }
             await save_conversation_state(conversation_id, new_state)
             return {"message": "Okay, please provide a brief reason for rejecting this leave request."}
         else:
             new_state = { "conversation_id": conversation_id, "user_employee_id": current_user["employee_id"], "active_flow": "REJECT_LEAVE_REQUEST", "collected_data": {}, "next_question": "leave_id", "last_updated": datetime.now(timezone.utc) }
             await save_conversation_state(conversation_id, new_state)
             return {"message": "Okay, which leave request ID would you like to reject?"}


    # Handle all other one-shot commands
    return await route_intent(intent, parameters, current_user)


# --- route_intent (No changes needed from previous version) ---
async def route_intent(intent: str, parameters: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
    # ... (implementation remains the same, handling one-shot intents) ...
    employee_id = current_user.get("employee_id")
    role_id = current_user.get("role_id")

    if intent == "GREETING":
        greetings = ["Hello! How can I help you today?", "Hi there! What can I do for you?", "Hey! How can I help?"]
        return {"message": random.choice(greetings)}

    if intent == "GET_CURRENT_DATE_TIME":
        now = datetime.now(timezone.utc).astimezone()
        return {"message": f"The current date and time is {now.strftime('%A, %B %d, %Y, %I:%M %p %Z')}."}

    if intent == "HELP":
        return {"message": "I can help with tasks like checking in/out, managing leave requests, getting employee details, or creating new employees. Just ask!"}

    if intent == "CHECK_IN":
        try: await attendance.check_in(current_user); return {"message": "You've been successfully checked in."}
        except Exception as e: return {"message": f"Sorry, I couldn't check you in. Reason: {getattr(e, 'detail', str(e))}"}

    if intent == "CHECK_OUT":
        try: await attendance.check_out(current_user); return {"message": "You've been successfully checked out."}
        except Exception as e: return {"message": f"Sorry, I couldn't check you out. Reason: {getattr(e, 'detail', str(e))}"}

    elif intent == "GET_TODAY_ATTENDANCE":
        if role_id not in ["admin", "hr"]: return {"message": "Sorry, you don't have permission to view today's attendance."}
        status_filter = parameters.get("status", "Present")
        try:
            report = await attendance.get_today_status_report()
            filtered_employees = [emp for emp in report if emp.get("status") == status_filter]
            if not filtered_employees: return {"message": f"I couldn't find any employees with the status '{status_filter}' today."}
            employee_names = [f"{e.get('first_name')} {e.get('last_name')}" for e in filtered_employees]
            return {"message": f"The following employees are {status_filter} today: {', '.join(employee_names)}."}
        except Exception as e: print(f"Error fetching attendance: {e}"); return {"message": "Sorry, I ran into an error while fetching the attendance report."}

    elif intent == "LIST_EMPLOYEES":
        if role_id not in ["admin", "hr"]: return {"message": "Sorry, you don't have permission to view employees."}
        department = parameters.get("department")
        query = {}
        if department: query["department"] = {"$regex": f"^{department}$", "$options": "i"}
        employees_cursor = employees_collection.find(query, {"_id": 0, "hashed_password": 0})
        employees = await employees_cursor.to_list(length=100)
        if not employees: dept_msg = f" in the {department}" if department else ""; return {"message": f"I couldn't find any employees{dept_msg}."}
        employee_names = [f"{e.get('first_name')} {e.get('last_name')} ({e.get('employee_id')})" for e in employees]
        dept_msg = f" in the {department} department" if department else ""
        return {"message": f"Here are the employees{dept_msg}: {', '.join(employee_names)}"}

    elif intent == "GET_EMPLOYEE_DETAILS":
        target_identifier = None
        if parameters.get("employee_id") == "self": target_identifier = employee_id
        elif parameters.get("employee_id"): target_identifier = parameters.get("employee_id")
        elif parameters.get("employee_name"): target_identifier = parameters.get("employee_name")
        else: return {"message": "I need an employee's name or ID to get their details."}
        target_employee = await _get_employee_by_identifier(target_identifier)
        if not target_employee: return {"message": f"I couldn't find an employee matching '{target_identifier}'. Please check the name or ID."}
        target_id = target_employee['employee_id']
        if role_id not in ["admin", "hr"] and target_id != employee_id: return {"message": "Sorry, you can only view your own details."}
        full_name = f"{target_employee.get('first_name')} {target_employee.get('last_name')}"
        job, dept, email = target_employee.get('job_title', 'N/A'), target_employee.get('department', 'N/A'), target_employee.get('email', 'N/A')
        reports_to_id = target_employee.get('reports_to')
        manager_name = "N/A"
        if reports_to_id:
            manager = await _get_employee_by_identifier(reports_to_id)
            if manager: manager_name = f"{manager.get('first_name')} {manager.get('last_name')}"
        return {"message": f"Details for {full_name} ({target_id}): Job: {job}, Dept: {dept}, Email: {email}, Reports to: {manager_name}."}

    elif intent == "GET_EMPLOYEE_SKILLS":
        target_identifier = None
        if parameters.get("employee_id") == "self": target_identifier = employee_id
        elif parameters.get("employee_id"): target_identifier = parameters.get("employee_id")
        elif parameters.get("employee_name"): target_identifier = parameters.get("employee_name")
        else: return {"message": "I need an employee's name or ID to get their skills."}
        target_employee = await _get_employee_by_identifier(target_identifier)
        if not target_employee: return {"message": f"I couldn't find an employee matching '{target_identifier}'. Please check the name or ID."}
        target_id = target_employee['employee_id']
        if role_id not in ["admin", "hr"] and target_id != employee_id: return {"message": "Sorry, you can only view your own skills."}
        skills_cursor = db.employee_skills.find({"employee_id": target_id})
        skills = await skills_cursor.to_list(length=100)
        if not skills: return {"message": f"{target_employee.get('first_name')} doesn't have any skills listed."}
        skill_list = [f"{s['skill_name']} ({s['proficiency_level']})" for s in skills]
        return {"message": f"Here are the skills for {target_employee.get('first_name')}: {', '.join(skill_list)}."}

    elif intent == "CREATE_LEAVE_REQUEST": # Handles one-shot case
        target_employee_id = parameters.get("employee_id", "self")
        if target_employee_id == "self": target_employee_id = employee_id
        elif role_id not in ["admin", "hr"]: return {"message": "You can only request leave for others if you are an admin or HR."}
        required_params = ["start_date", "end_date", "reason", "leave_type"]
        missing_params = [p for p in required_params if p not in parameters or not parameters[p]]
        if missing_params: return {"message": f"To submit a leave request, I'm missing: {', '.join(missing_params)}."}
        try:
            start_date_str = parameters["start_date"]; end_date_str = parameters["end_date"]
            try: datetime.fromisoformat(start_date_str.replace('Z', '+00:00')); datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            except ValueError: return {"message": "The start or end date seems to be in an invalid format. Please use YYYY-MM-DD."}
            try:
                type_map = {"sick": LeaveTypeEnum.sick, "sickness": LeaveTypeEnum.sick, "ill": LeaveTypeEnum.sick, "vacation": LeaveTypeEnum.vacation, "holiday": LeaveTypeEnum.vacation, "annual": LeaveTypeEnum.vacation, "wfh": LeaveTypeEnum.wfh, "work from home": LeaveTypeEnum.wfh, "remote": LeaveTypeEnum.wfh, "personal": LeaveTypeEnum.personal, "personal leave": LeaveTypeEnum.personal}
                leave_type_input = parameters["leave_type"].lower().strip()
                leave_type_val = type_map.get(leave_type_input, LeaveTypeEnum.personal).value
            except Exception: leave_type_val = LeaveTypeEnum.personal.value
            await leave_service.create_leave_request_service(employee_id=target_employee_id, reason=parameters["reason"], start_date_str=start_date_str, end_date_str=end_date_str, leave_type_str=leave_type_val)
            return {"message": f"I've submitted a {leave_type_val} leave request for {target_employee_id} from {start_date_str} to {end_date_str}."}
        except Exception as e: return {"message": f"I ran into an error submitting the leave request: {getattr(e, 'detail', str(e))}"}

    elif intent == "ALLOT_ASSET":
        if role_id not in ["admin", "hr"]: return {"message": "Sorry, you don't have permission to allot assets."}
        asset_id = parameters.get("asset_id"); employee_id_to_allot = parameters.get("employee_id")
        if not asset_id or not employee_id_to_allot: return {"message": "I need both the asset ID and employee ID to allot an asset."}
        try:
            asset = await assets_collection.find_one({"asset_id": asset_id.upper()})
            if not asset: return {"message": f"Asset ID '{asset_id}' not found."}
            emp = await employees_collection.find_one({"employee_id": employee_id_to_allot.upper()})
            if not emp: return {"message": f"Employee ID '{employee_id_to_allot}' not found."}
            await asset_service.allot_asset_service(asset_id.upper(), employee_id_to_allot.upper())
            return {"message": f"Asset {asset_id.upper()} has been successfully allotted to employee {employee_id_to_allot.upper()}."}
        except Exception as e: return {"message": f"I ran into an error allotting the asset: {getattr(e, 'detail', str(e))}"}

    else: # UNKNOWN or ERROR
        error_detail = parameters.get("detail")
        if intent == "ERROR" and error_detail: print(f"AI Service Error: {error_detail}"); return {"message": "Sorry, I encountered an internal error. Please try again later."}
        return {"message": "I'm not sure how to help with that. Could you please rephrase, or ask for 'help'?"}