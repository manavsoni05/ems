# backend/app/models/notification.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from .pyobjectid import PyObjectId # Assuming you have this from previous context
from pydantic import ConfigDict

class NotificationBase(BaseModel):
    """
    Represents the core notification event details, shared across recipients,
    including different message/link versions based on the viewer.
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    notification_id: str = Field(..., description="Primary key for the notification event")
    # Message variations
    message_self: str = Field(..., description="Message shown to the subject employee")
    message_other: str = Field(..., description="Message shown to other viewers (admin/hr)")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    # Link variations
    link_self: Optional[str] = Field(None, description="Link for the subject employee")
    link_other: Optional[str] = Field(None, description="Link for other viewers (admin/hr)")
    type: str # e.g., 'leave_request', 'check_in', 'asset_allotment'
    subject_employee_id: Optional[str] = Field(None, description="Employee the notification is *about*")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str},
    )

class NotificationInDB(NotificationBase):
    pass

class NotificationWithStatus(BaseModel):
    """
    Combines core notification details with user-specific status and the
    correctly selected message/link for display.
    """
    notification_id: str
    display_message: str # The final message to show the user
    timestamp: datetime
    display_link: Optional[str] # The final link to use
    type: str
    subject_employee_id: Optional[str]
    user_notification_id: str # From the UserNotificationStatus link
    read_status: bool        # From the UserNotificationStatus link

    # We need ConfigDict here too if using PyObjectId indirectly or needing aliases
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={PyObjectId: str},
    )