# backend/app/routers/performance_reviews.py
import uuid
from fastapi import APIRouter, Depends, status, HTTPException
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.dependencies.auth import get_current_employee, require_role, require_permission
from app.models.performance_review import PerformanceReviewInDB, PerformanceReviewCreate, PerformanceReviewUpdate
from datetime import datetime, timezone # Added timezone
from app.services import notification_service # Ensure import

router = APIRouter(
    tags=["Performance Reviews"],
    redirect_slashes=False
)

db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
collection = db.performance_reviews
employees_collection = db.employees # Needed for validation and names

@router.post("", status_code=status.HTTP_201_CREATED, response_model=PerformanceReviewInDB, dependencies=[Depends(require_permission("performance:create"))])
async def create_performance_review(review_in: PerformanceReviewCreate, current_user: Dict[str, Any] = Depends(get_current_employee)):
    # Check against active employees
    employee_to_review = await employees_collection.find_one(
        {"employee_id": review_in.employee_id, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not employee_to_review: 
        raise HTTPException(status_code=404, detail=f"Employee with ID {review_in.employee_id} not found.")

    review_doc = review_in.model_dump()
    review_doc["review_id"] = f"REV-{uuid.uuid4().hex[:8].upper()}"
    review_doc["reviewer_id"] = current_user["employee_id"]
    review_doc["review_date"] = datetime.combine(review_in.review_date, datetime.min.time(), tzinfo=timezone.utc)
    review_doc["is_deleted"] = False # <-- ADD THIS

    insert_result = await collection.insert_one(review_doc)
    if not insert_result.inserted_id: 
        raise HTTPException(status_code=500, detail="Failed to save performance review.")
        
    created_review = await collection.find_one({"review_id": review_doc["review_id"]})
    if not created_review: 
        raise HTTPException(status_code=500, detail="Failed to retrieve created performance review.")

    # --- Notification Logic ---
    recipient_ids = [review_in.employee_id] 
    admin_hr_ids = await notification_service.get_admin_hr_ids()
    admin_hr_ids = [uid for uid in admin_hr_ids if uid != review_in.employee_id] 

    all_recipient_ids = list(set(recipient_ids + admin_hr_ids))

    reviewer = await employees_collection.find_one({"employee_id": current_user["employee_id"]})
    reviewer_name = f"{reviewer.get('first_name', '')} {reviewer.get('last_name', '')}".strip() if reviewer else "Reviewer"
    employee_name = f"{employee_to_review.get('first_name', '')} {employee_to_review.get('last_name', '')}".strip()

    await notification_service.create_notification(
        recipient_ids=all_recipient_ids,
        message_self=f"You have received a new performance review from {reviewer_name}.",
        message_other=f"A performance review for {employee_name} ({review_in.employee_id}) was submitted by {reviewer_name}.",
        link_self="/employee/my-performance-reviews",
        link_other="/admin/manage-performance-reviews", 
        type="performance_review",
        subject_employee_id=review_in.employee_id 
    )
    # --- End Notification Logic ---

    return created_review

@router.get("", response_model=List[Dict[str, Any]], dependencies=[Depends(require_permission("performance:read_all"))])
async def list_all_performance_reviews():
    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}}}, # <-- ADD FILTER
        {"$lookup": {"from": "employees", "localField": "employee_id", "foreignField": "employee_id", "as": "employee_details"}},
        {"$unwind": {"path": "$employee_details", "preserveNullAndEmptyArrays": True}},
        # Also filter out reviews for deleted employees
        {"$match": {"employee_details.is_deleted": {"$ne": True}}}, # <-- ADD FILTER
        {"$lookup": {"from": "employees", "localField": "reviewer_id", "foreignField": "employee_id", "as": "reviewer_details"}},
        {"$unwind": {"path": "$reviewer_details", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0, "review_id": 1, "employee_id": 1,
            "first_name": "$employee_details.first_name", "last_name": "$employee_details.last_name",
            "reviewer_id": 1, "reviewer_name": { "$concat": ["$reviewer_details.first_name", " ", "$reviewer_details.last_name"] },
            "review_date": 1, "rating": 1, "comments": 1
        }},
        {"$sort": {"review_date": -1}}
    ]
    reviews = await collection.aggregate(pipeline).to_list(None)
    return reviews

@router.get("/me", response_model=List[PerformanceReviewInDB], dependencies=[Depends(require_permission("performance:read_self"))])
async def get_my_performance_reviews(current_user: Dict[str, Any] = Depends(get_current_employee)):
    reviews = await collection.find(
        {"employee_id": current_user["employee_id"], "is_deleted": {"$ne": True}} # <-- FILTER
    ).sort("review_date", -1).to_list(1000)
    return reviews

@router.put("/{review_id}", response_model=PerformanceReviewInDB, dependencies=[Depends(require_permission("performance:update"))])
async def update_performance_review(review_id: str, review_update: PerformanceReviewUpdate, current_user: Dict[str, Any] = Depends(get_current_employee)):
    update_data = review_update.model_dump(exclude_unset=True)
    if not update_data: 
        raise HTTPException(status_code=400, detail="No update data provided.")
    update_data.pop("employee_id", None); update_data.pop("reviewer_id", None); update_data.pop("review_date", None)
    
    existing_review = await collection.find_one(
        {"review_id": review_id, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not existing_review: 
        raise HTTPException(status_code=404, detail="Performance review not found.")
        
    result = await collection.update_one({"review_id": review_id}, {"$set": update_data})
    if result.matched_count == 0: 
        raise HTTPException(status_code=404, detail="Performance review not found during update.")
        
    updated_review = await collection.find_one({"review_id": review_id})
    if not updated_review: 
        raise HTTPException(status_code=500, detail="Failed to retrieve updated review.")
    return updated_review

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("performance:delete"))])
async def delete_performance_review(review_id: str):
    # --- SOFT DELETE ---
    result = await collection.update_one(
        {"review_id": review_id},
        {"$set": {"is_deleted": True}}
    )
    # --- END SOFT DELETE ---
    if result.deleted_count == 0: 
        raise HTTPException(status_code=404, detail="Performance review not found")
    return