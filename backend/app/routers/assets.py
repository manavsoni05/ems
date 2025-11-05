# backend/app/routers/assets.py
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from pydantic import BaseModel, ValidationError
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.dependencies.auth import get_current_employee, require_role, require_permission 
# --- IMPORT AssetUpdate ---
from app.models.asset import AssetInDB, AllottedAssetInDB, AssetWithDetails, MyAssetResponse, AssetCreate, AllottedAssetBase, AssetUpdate
from datetime import datetime, timezone, date
from app.services import notification_service
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


router = APIRouter(
    tags=["Assets"],
    redirect_slashes=False
)

db_client = AsyncIOMotorClient(settings.MONGO_URI)
db = db_client[settings.MONGO_DB_NAME]
assets_collection = db.assets
allotted_collection = db.allotted_assets
employees_collection = db.employees

class AllotmentRequest(BaseModel):
    asset_id: str
    employee_id: str

class ReclaimRequest(BaseModel):
    asset_id: str

class TeamAllotmentRequest(BaseModel):
    asset_id: str
    manager_id: str

@router.post("", status_code=status.HTTP_201_CREATED, response_model=AssetInDB, dependencies=[Depends(require_permission("asset:create"))])
async def create_asset(asset_in: AssetCreate):
    # Check against non-deleted assets
    if await assets_collection.find_one({"serial_number": asset_in.serial_number, "is_deleted": False}): # <-- FILTER
        raise HTTPException(status_code=400, detail="Asset with this serial number already exists")
    asset_doc = asset_in.model_dump()
    asset_doc["asset_id"] = f"AST-{uuid.uuid4().hex[:8].upper()}"
    asset_doc["status"] = "Available"
    asset_doc["purchase_date"] = datetime.combine(asset_in.purchase_date, datetime.min.time(), tzinfo=timezone.utc)
    asset_doc["is_deleted"] = False # <-- ADD THIS
    
    insert_result = await assets_collection.insert_one(asset_doc)
    if not insert_result.inserted_id:
         raise HTTPException(status_code=500, detail="Failed to create asset.")
    created_asset = await assets_collection.find_one({"asset_id": asset_doc["asset_id"]})
    if not created_asset:
        raise HTTPException(status_code=500, detail="Failed to retrieve created asset.")
    return created_asset

@router.get("", response_model=List[AssetWithDetails], dependencies=[Depends(require_permission("asset:read_all"))])
async def list_assets_with_details():
    """Lists all non-deleted assets, including current allotment details if available."""
    pipeline = [
        # --- ADD FILTER ---
        {"$match": {"is_deleted": {"$ne": True}}},
        # 1. Lookup the current allotment (return_date is None AND not deleted)
        {"$lookup": {
            "from": "allotted_assets",
            "let": {"asset_id_lookup": "$asset_id"},
            "pipeline": [
                {"$match": {
                    "$expr": {
                        "$and": [
                            {"$eq": ["$asset_id", "$$asset_id_lookup"]},
                            {"$eq": ["$return_date", None]},
                            {"$ne": ["$is_deleted", True]} # <-- FILTER
                        ]
                    }
                }},
                {"$sort": {"allotment_date": -1}},
                {"$limit": 1}
            ],
            "as": "current_allotment_array"
        }},
        # 2. Get the allotment object or null
        {"$addFields": {
            "allotment_obj": {"$arrayElemAt": ["$current_allotment_array", 0]}
        }},
        # 3. Final Projection
        {"$project": {
            "_id": 1, 
            "asset_id": 1, "asset_name": 1, "asset_type": 1,
            "serial_number": 1, "purchase_date": 1, "status": 1, "is_deleted": 1, # <-- Include is_deleted
            "allotment_info": {
                 "$cond": {
                    "if": {"$ifNull": ["$allotment_obj.allotment_id", None]}, 
                    "then": {
                        "allotment_id": "$allotment_obj.allotment_id",
                        "asset_id": "$allotment_obj.asset_id",
                        "employee_id": "$allotment_obj.employee_id",
                        "allotment_date": "$allotment_obj.allotment_date",
                        "return_date": "$allotment_obj.return_date",
                        "is_team_asset": {"$ifNull": ["$allotment_obj.is_team_asset", False]},
                         "id": "$allotment_obj._id",
                         "is_deleted": "$allotment_obj.is_deleted" # <-- Include is_deleted
                    },
                    "else": None
                 }
            }
        }},
        {"$sort": {"asset_id": 1}}
    ]
    try:
        assets_raw = await assets_collection.aggregate(pipeline).to_list(None)
        return assets_raw
    except ValidationError as e:
        logger.error(f"Pydantic Validation Error in list_assets_with_details: {e.json()}")
        logger.error(f"Data causing validation error: {assets_raw}")
        raise HTTPException(status_code=500, detail="Data validation error retrieving asset details.")
    except Exception as e:
        logger.error(f"Error during asset aggregation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving asset details.")


@router.get("/me", response_model=List[MyAssetResponse], dependencies=[Depends(require_permission("asset:read_self"))])
async def get_my_allotted_assets(current_user: Dict[str, Any] = Depends(get_current_employee)):
    pipeline = [
        # Filter for non-deleted allotments
        {"$match": {
            "employee_id": current_user["employee_id"], 
            "return_date": None, 
            "is_team_asset": {"$ne": True},
            "is_deleted": {"$ne": True} # <-- FILTER
        }},
        {"$lookup": {
            "from": "assets", 
            "localField": "asset_id", 
            "foreignField": "asset_id", 
             # Also filter the lookup to exclude deleted assets
            "pipeline": [
                {"$match": {"is_deleted": {"$ne": True}}} # <-- FILTER
            ],
            "as": "asset_details_array"
        }},
        {"$addFields": {"asset_details": {"$arrayElemAt": ["$asset_details_array", 0]}}},
         # Ensure we only return allotments where the asset wasn't deleted
        {"$match": {"asset_details": {"$ne": None}}}, # <-- FILTER
        {"$project": {"asset_details_array": 0, "_id": 0}}, 
        {"$sort": {"allotment_date": -1}}
    ]
    my_assets = await allotted_collection.aggregate(pipeline).to_list(None)
    return my_assets

@router.get("/team", response_model=List[MyAssetResponse])
async def get_team_assets(current_user: Dict[str, Any] = Depends(get_current_employee)):
    pipeline = [
        {"$match": {
            "employee_id": current_user["employee_id"], 
            "return_date": None, 
            "is_team_asset": True,
            "is_deleted": {"$ne": True} # <-- FILTER
        }},
        {"$lookup": {
            "from": "assets", 
            "localField": "asset_id", 
            "foreignField": "asset_id", 
            "pipeline": [
                {"$match": {"is_deleted": {"$ne": True}}} # <-- FILTER
            ],
            "as": "asset_details_array"
        }},
        {"$addFields": {"asset_details": {"$arrayElemAt": ["$asset_details_array", 0]}}},
        {"$match": {"asset_details": {"$ne": None}}}, # <-- FILTER
        {"$project": {"asset_details_array": 0, "_id": 0}},
        {"$sort": {"allotment_date": -1}}
    ]
    team_assets = await allotted_collection.aggregate(pipeline).to_list(None)
    return team_assets

@router.post("/allot", status_code=status.HTTP_201_CREATED, response_model=AllottedAssetInDB, dependencies=[Depends(require_permission("asset:allot"))])
async def allot_asset(allotment_in: AllotmentRequest, current_user: Dict[str, Any] = Depends(get_current_employee)):
    # Find non-deleted asset
    asset = await assets_collection.find_one(
        {"asset_id": allotment_in.asset_id, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not asset or asset["status"] != "Available": 
        raise HTTPException(status_code=400, detail="Asset is not available for allotment")
    # Find non-deleted employee
    employee = await employees_collection.find_one(
        {"employee_id": allotment_in.employee_id, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not employee: 
        raise HTTPException(status_code=404, detail="Employee not found")
    # Check for existing *active*, *non-deleted* allotment
    existing_allotment = await allotted_collection.find_one(
        {"asset_id": allotment_in.asset_id, "return_date": None, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if existing_allotment: 
        raise HTTPException(status_code=400, detail="Asset is already allotted.")

    allotment_doc = {
        "allotment_id": f"ALLOT-{uuid.uuid4().hex[:8].upper()}",
        "asset_id": allotment_in.asset_id, "employee_id": allotment_in.employee_id,
        "allotment_date": datetime.now(timezone.utc), "return_date": None,
        "is_team_asset": False,
        "is_deleted": False # <-- ADD THIS
    }
    insert_result = await allotted_collection.insert_one(allotment_doc)
    if not insert_result.inserted_id: 
        raise HTTPException(status_code=500, detail="Failed to record asset allotment.")
        
    update_result = await assets_collection.update_one(
        {"asset_id": allotment_in.asset_id}, {"$set": {"status": "Allotted"}}
    )
    if update_result.matched_count == 0:
        await allotted_collection.delete_one({"allotment_id": allotment_doc["allotment_id"]})
        raise HTTPException(status_code=500, detail="Failed to update asset status after allotment.")

    # --- Notification Logic (remains same) ---
    recipient_ids = [allotment_in.employee_id]
    admin_hr_ids = await notification_service.get_admin_hr_ids()
    admin_hr_ids = [uid for uid in admin_hr_ids if uid != allotment_in.employee_id]
    all_recipient_ids = list(set(recipient_ids + admin_hr_ids))
    allotter_name = f"{current_user.get('first_name', 'System')} {current_user.get('last_name', '')}".strip()
    employee_name = f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip()

    await notification_service.create_notification(
        recipient_ids=all_recipient_ids,
        message_self=f"Asset '{asset['asset_name']}' ({asset['asset_id']}) has been allotted to you.",
        message_other=f"Asset '{asset['asset_name']}' ({asset['asset_id']}) has been allotted to {employee_name} ({allotment_in.employee_id}) by {allotter_name}.",
        link_self="/employee/my-assets", link_other="/admin/manage-assets",
        type="asset_allotment", subject_employee_id=allotment_in.employee_id
    )
    # --- End Notification Logic ---

    created_allotment = await allotted_collection.find_one({"allotment_id": allotment_doc["allotment_id"]})
    if not created_allotment: 
        raise HTTPException(status_code=500, detail="Failed to retrieve created allotment record.")
    return created_allotment

@router.post("/allot-to-team", status_code=status.HTTP_201_CREATED, response_model=AllottedAssetInDB, dependencies=[Depends(require_permission("asset:allot"))])
async def allot_asset_to_team(allotment_in: TeamAllotmentRequest, current_user: Dict[str, Any] = Depends(get_current_employee)):
    asset = await assets_collection.find_one(
        {"asset_id": allotment_in.asset_id, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not asset or asset["status"] != "Available": 
        raise HTTPException(status_code=400, detail="Asset is not available for team allotment")
    manager = await employees_collection.find_one(
        {"employee_id": allotment_in.manager_id, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not manager: 
        raise HTTPException(status_code=404, detail="Manager not found")
    existing_allotment = await allotted_collection.find_one(
        {"asset_id": allotment_in.asset_id, "return_date": None, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if existing_allotment: 
        raise HTTPException(status_code=400, detail="Asset is already allotted.")

    allotment_doc = {
        "allotment_id": f"ALLOT-{uuid.uuid4().hex[:8].upper()}",
        "asset_id": allotment_in.asset_id, "employee_id": allotment_in.manager_id,
        "is_team_asset": True, "allotment_date": datetime.now(timezone.utc), "return_date": None,
        "is_deleted": False # <-- ADD THIS
    }
    insert_result = await allotted_collection.insert_one(allotment_doc)
    if not insert_result.inserted_id: 
        raise HTTPException(status_code=500, detail="Failed to record team asset allotment.")
    update_result = await assets_collection.update_one(
        {"asset_id": allotment_in.asset_id}, {"$set": {"status": "Allotted"}}
    )
    if update_result.matched_count == 0:
        await allotted_collection.delete_one({"allotment_id": allotment_doc["allotment_id"]})
        raise HTTPException(status_code=500, detail="Failed to update asset status after team allotment.")

    # --- Notification Logic (remains same) ---
    recipient_ids = [allotment_in.manager_id]
    admin_hr_ids = await notification_service.get_admin_hr_ids()
    admin_hr_ids = [uid for uid in admin_hr_ids if uid != allotment_in.manager_id]
    all_recipient_ids = list(set(recipient_ids + admin_hr_ids))
    allotter_name = f"{current_user.get('first_name', 'System')} {current_user.get('last_name', '')}".strip()
    manager_name = f"{manager.get('first_name', '')} {manager.get('last_name', '')}".strip()

    await notification_service.create_notification(
        recipient_ids=all_recipient_ids,
        message_self=f"Asset '{asset['asset_name']}' ({asset['asset_id']}) has been allotted to your team.",
        message_other=f"Team asset '{asset['asset_name']}' ({asset['asset_id']}) has been allotted to {manager_name}'s team by {allotter_name}.",
        link_self="/employee/my-assets", link_other="/admin/manage-assets",
        type="asset_allotment_team", subject_employee_id=allotment_in.manager_id
    )
    # --- End Notification Logic ---

    created_allotment = await allotted_collection.find_one({"allotment_id": allotment_doc["allotment_id"]})
    if not created_allotment: 
        raise HTTPException(status_code=500, detail="Failed to retrieve created team allotment record.")
    return created_allotment

@router.post("/reclaim", status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission("asset:reclaim"))])
async def reclaim_asset(reclaim_in: ReclaimRequest, current_user: Dict[str, Any] = Depends(get_current_employee)):
    asset_id_to_reclaim = reclaim_in.asset_id
    asset = await assets_collection.find_one(
        {"asset_id": asset_id_to_reclaim, "is_deleted": {"$ne": True}} # <-- FILTER
    )
    if not asset: 
        raise HTTPException(status_code=404, detail="Asset not found")

    # Find the current, non-deleted allotment
    current_allotment = await allotted_collection.find_one(
        {"asset_id": asset_id_to_reclaim, "return_date": None, "is_deleted": {"$ne": True}} # <-- FILTER
    )

    if not current_allotment:
        if asset["status"] != "Available":
             logger.warning(f"Asset {asset_id_to_reclaim} status is '{asset['status']}' but no active allotment found. Setting status to Available.")
             await assets_collection.update_one(
                {"asset_id": asset_id_to_reclaim}, {"$set": {"status": "Available"}}
             )
             return {"detail": "Asset status corrected to Available as no active allotment was found."}
        else:
             raise HTTPException(status_code=400, detail="Asset is already available and not allotted.")


    # This endpoint sets return_date, it does not soft-delete the allotment
    update_result = await allotted_collection.update_one(
        {"_id": current_allotment["_id"]}, {"$set": {"return_date": datetime.now(timezone.utc)}}
    )
    if update_result.modified_count == 0:
        logger.error(f"Failed to mark asset {asset_id_to_reclaim} as returned in allotment record {current_allotment['_id']}.")
        
    asset_update_result = await assets_collection.update_one(
        {"asset_id": asset_id_to_reclaim}, {"$set": {"status": "Available"}}
    )
    if asset_update_result.matched_count == 0:
        logger.error(f"Error: Failed to update asset status for {asset_id_to_reclaim} after reclaiming.")
        
    # --- Notification Logic (remains same) ---
    reclaimed_from_employee_id = current_allotment["employee_id"]
    recipient_ids = [reclaimed_from_employee_id]
    admin_hr_ids = await notification_service.get_admin_hr_ids()
    admin_hr_ids = [uid for uid in admin_hr_ids if uid != reclaimed_from_employee_id]
    all_recipient_ids = list(set(recipient_ids + admin_hr_ids))
    reclaimer_name = f"{current_user.get('first_name', 'System')} {current_user.get('last_name', '')}".strip()
    reclaimed_from_employee = await employees_collection.find_one({"employee_id": reclaimed_from_employee_id})
    reclaimed_from_name = f"{reclaimed_from_employee.get('first_name', '')} {reclaimed_from_employee.get('last_name', '')}".strip() if reclaimed_from_employee else reclaimed_from_employee_id

    message_self = f"Asset '{asset['asset_name']}' ({asset_id_to_reclaim}) has been reclaimed from you."
    message_other = f"Asset '{asset['asset_name']}' ({asset_id_to_reclaim}) has been reclaimed from {reclaimed_from_name} by {reclaimer_name}."

    await notification_service.create_notification(
        recipient_ids=all_recipient_ids,
        message_self=message_self, message_other=message_other,
        link_self="/employee/my-assets", link_other="/admin/manage-assets",
        type="asset_reclaim", subject_employee_id=reclaimed_from_employee_id
    )
    # --- End Notification Logic ---

    return {"detail": "Asset reclaimed successfully"}

# --- ADD NEW DELETE ENDPOINT ---
@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("asset:delete"))])
async def delete_asset(asset_id: str):
    """
    Soft-deletes an asset and all its associated allotment records.
    """
    delete_payload = {"$set": {"is_deleted": True}}
    
    # Soft delete the asset
    asset_result = await assets_collection.update_one(
        {"asset_id": asset_id},
        delete_payload
    )
    
    if asset_result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Soft delete all allotment records for this asset
    allotment_result = await allotted_collection.update_many(
        {"asset_id": asset_id},
        delete_payload
    )
    
    logger.info(f"Soft-deleted asset {asset_id} and {allotment_result.modified_count} allotment records.")
    
    return
# --- END ADD ---