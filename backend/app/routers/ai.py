from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from typing import Dict, Any
from app.dependencies.auth import get_current_employee
from app.services import intent_router

router = APIRouter()

class AICommand(BaseModel):
    command: str
    conversation_id: str

@router.post("/command")
async def process_ai_command(
    payload: AICommand = Body(...), 
    current_user: Dict[str, Any] = Depends(get_current_employee)
):
    """
    Processes a command from the user, maintaining conversation state.
    """
    command = payload.command
    conversation_id = payload.conversation_id
    
    # The intent router now handles the entire conversational turn
    response_message = await intent_router.handle_ai_command(command, conversation_id, current_user)
    
    return response_message