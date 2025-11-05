# backend/app/models/user_notification.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from .pyobjectid import PyObjectId
from pydantic import ConfigDict

class UserNotificationStatusBase(BaseModel):
    """
    Represents the link between a user and a notification,
    tracking individual read/deleted status.
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_notification_id: str = Field(..., description="Primary key for the user-notification link")
    user_id: str = Field(..., description="Employee ID of the recipient")
    notification_id: str = Field(..., description="Foreign key to the Notifications collection")
    read_status: bool = False
    deleted: bool = False # For soft deletes
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str},
    )

class UserNotificationStatusInDB(UserNotificationStatusBase):
    pass

class UserNotificationStatusUpdate(BaseModel):
    """
    Model for updating the status of a user's notification link.
    """
    read_status: Optional[bool] = None
    deleted: Optional[bool] = None