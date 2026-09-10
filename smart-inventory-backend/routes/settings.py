from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.db import get_db
from utils.security import require_permission

router = APIRouter(prefix="/api/settings", tags=["settings"])

STORED_SETTINGS = {
    "profile": {
        "name": "Operations Lead",
        "role": "Supply Chain Operations Lead",
        "organization": "Active Organization",
        "email": "user@example.com",
    },
    "workspace": {
        "organization": "Active Organization",
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
def get_settings(
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("settings.read")),
):
    """Retrieve workspace, profile, and AI risk preferences for active organization."""
    current_user, current_org = auth_data
    settings = dict(STORED_SETTINGS)
    settings["profile"] = {
        "name": current_user.full_name,
        "role": "Operations Lead",
        "organization": current_org.name,
        "email": current_user.email,
    }
    settings["workspace"]["organization"] = current_org.name
    return settings


@router.put("")
def update_settings(
    request: SettingsUpdateRequest,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("settings.write")),
):
    """Update workspace, profile, and AI risk preferences for active organization."""
    current_user, current_org = auth_data

    if request.profile:
        STORED_SETTINGS["profile"].update(request.profile)
    if request.aiPreferences:
        STORED_SETTINGS["aiPreferences"].update(request.aiPreferences)

    settings = dict(STORED_SETTINGS)
    settings["profile"]["organization"] = current_org.name
    settings["workspace"]["organization"] = current_org.name
    return settings
