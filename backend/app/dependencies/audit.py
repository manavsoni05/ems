import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from datetime import datetime, timezone

class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        mutating_methods = ["POST", "PUT", "PATCH", "DELETE"]
        
        response = await call_next(request)
        
        if request.method in mutating_methods:
            user_id = "anonymous" 
            payload = {}

            # Check the content-type of the request
            content_type = request.headers.get('content-type')

            # --- FIX STARTS HERE ---
            # Only try to read the body if it's JSON.
            # Skip for form data, multipart, etc.
            if content_type and "application/json" in content_type:
                try:
                    # To read the body here and still have it available for the endpoint,
                    # we need to read it and then "re-create" the stream.
                    # However, a simpler fix is to just not log bodies we know will cause issues.
                    # For a more advanced logger, you'd read the stream into a variable
                    # and then pass it along.
                    # For this project, we will just log the content type for non-json requests.
                    payload = await request.json()
                except json.JSONDecodeError:
                    payload = {"detail": "Payload not JSON decodable"}
                except RuntimeError as e:
                    # This handles the "Stream consumed" error if another dependency read it first.
                    print(f"Audit log: Could not read request body, it was likely consumed by the endpoint. Error: {e}")
                    payload = {"detail": "Request body was already consumed."}
            else:
                payload = {"detail": f"Payload content-type is '{content_type}', not logged as JSON."}
            # --- FIX ENDS HERE ---

            log_entry = {
                "user_id": user_id,
                "action": request.method,
                "path": request.url.path,
                "payload": payload,
                "outcome": response.status_code,
                "timestamp": datetime.now(timezone.utc)
            }

            try:
                client = AsyncIOMotorClient(settings.MONGO_URI)
                db = client[settings.MONGO_DB_NAME]
                await db.audit_logs.insert_one(log_entry)
            except Exception as e:
                print(f"Failed to write to audit log: {e}")

        return response