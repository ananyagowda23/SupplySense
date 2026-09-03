from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/settings", tags=["settings"])

STORED_SETTINGS = {
    "profile": {
        "name": "Ananya",
        "role": "Supply Chain Operations Lead",
        "organization": "SupplySense Production",
        "email": "ananya@example.com",
    },
    "workspace": {
        "organization": "SupplySense Production",
        "environment": "Production",
        "activeLocation": "Hyderabad DC",
        "dataStatus": "FastAPI Live",
        "lastSynchronized": "Just now",
    },
    "aiPreferences": {
        "enableAIRecommendations": True,
        "requireApprovalBeforeAction": True,
        "confidenceThreshold": 80,
        "riskTolerance": "MEDIUM",
        "supplierStrategy": "BALANCED",
    },
}


class SettingsUpdateRequest(BaseModel):
    profile: Optional[dict] = None
    aiPreferences: Optional[dict] = None


@router.get("")
def get_settings():
    """Retrieve workspace, profile, and AI risk preferences."""
    return STORED_SETTINGS


@router.put("")
def update_settings(request: SettingsUpdateRequest):
    """Update workspace, profile, and AI risk preferences."""
    if request.profile:
        STORED_SETTINGS["profile"].update(request.profile)
    if request.aiPreferences:
        STORED_SETTINGS["aiPreferences"].update(request.aiPreferences)

    return STORED_SETTINGS
