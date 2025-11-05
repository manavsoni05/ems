# backend/app/dependencies/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from typing import Dict, Any, List
from app.config import settings
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.models.employee import TokenPayload
# 1. Import database for login
from motor.motor_asyncio import AsyncIOMotorClient
from app.schemas import employee_schema

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# 2. Add database client for login
db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
roles_collection = db.roles

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def get_current_employee(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        employee_id: str | None = payload.get("Employee_id")
        role_id: str | None = payload.get("role")
        # 3. Extract permissions from token
        permissions: List[str] = payload.get("permissions", []) # Default to empty list
        
        if employee_id is None or role_id is None:
            raise credentials_exception

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        raise credentials_exception
    except Exception as e:
        raise credentials_exception

    # 4. Return permissions in the user dictionary
    return {"employee_id": employee_id, "role_id": role_id, "permissions": permissions}

def require_role(allowed_roles: List[str]):
    """
    Existing dependency, kept for bootstrapping admin roles.
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_employee)):
        user_role = current_user.get("role_id")
        if user_role not in allowed_roles:
            if user_role != 'admin' or 'admin' in allowed_roles: 
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="The user does not have permissions to perform this action"
                )
        return current_user
    return role_checker

# 5. --- NEW PERMISSION DEPENDENCY ---
def require_permission(required_permission: str):
    """
    New dependency that checks if a user has a specific permission.
    Also grants access if the user has the 'admin' role.
    """
    async def permission_checker(current_user: Dict[str, Any] = Depends(get_current_employee)):
        user_permissions = current_user.get("permissions", [])
        
        # Super-admin override: 'admin' role can do anything
        if current_user.get("role_id") == 'admin':
            return current_user
            
        if required_permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {required_permission}"
            )
        return current_user
    return permission_checker
# --- END NEW PERMISSION DEPENDENCY ---