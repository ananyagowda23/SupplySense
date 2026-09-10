from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import AuditLog
from utils.security import require_permission

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("")
def get_activity_logs(
    type_filter: Optional[str] = "ALL",
    date_filter: Optional[str] = "ALL",
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("activity.read")),
):
    """Retrieve operational audit logs and system events for the active organization from database."""
    _, current_org = auth_data

    query = (
        db.query(AuditLog)
        .filter(AuditLog.organization_id == current_org.id)
        .order_by(AuditLog.timestamp.desc())
    )

    if type_filter and type_filter != "ALL":
        query = query.filter(AuditLog.resource_type == type_filter)

    logs = query.limit(100).all()

    formatted_logs = []
    for item in logs:
        details = item.details or {}
        time_str = (
            item.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            if item.timestamp
            else "Just now"
        )

        formatted_logs.append(
            {
                "id": str(item.id),
                "type": details.get("type", item.action),
                "actor": details.get("actor", "User"),
                "title": details.get("title", f"Event: {item.action}"),
                "description": details.get("description", f"Action {item.action} performed on {item.resource_type} {item.resource_id or ''}."),
                "timestamp": time_str,
                "timeGroup": "TODAY",
                "productId": details.get("productId"),
                "productName": details.get("productName"),
                "sku": details.get("sku"),
                "location": details.get("location"),
                "supplierId": details.get("supplierId"),
                "supplierName": details.get("supplierName"),
                "action": details.get("action"),
                "quantity": details.get("quantity"),
                "confidence": details.get("confidence"),
                "humanDecision": details.get("humanDecision", details.get("decision")),
            }
        )

    return formatted_logs
