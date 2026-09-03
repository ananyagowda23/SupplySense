from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.db import get_db

router = APIRouter(prefix="/api/activity", tags=["activity"])

# Dynamic activity store for system audit logs
ACTIVITY_LOGS = [
    {
        "id": "act-101",
        "type": "AI_RECOMMENDATION",
        "actor": "AI Agent",
        "title": "AI Order Recommendation Generated",
        "description": "Trained PPO/CQL engine generated ORDER recommendation for 250 units of Semiconductor X-400 with 91% confidence score.",
        "timestamp": "10 min ago",
        "timeGroup": "TODAY",
        "productId": "1",
        "productName": "Semiconductor X-400",
        "sku": "SEM-1042",
        "location": "Hyderabad DC",
        "supplierId": "1",
        "supplierName": "Silicon Dynamics",
        "action": "ORDER",
        "quantity": 250,
        "confidence": 91,
        "expectedProfitImpact": 18000,
        "serviceLevelImpact": 2.4,
    },
    {
        "id": "act-102",
        "type": "ORDER",
        "actor": "Operations",
        "title": "Purchase Order Approved",
        "description": "Operations Lead approved AI order recommendation for 250 units of Semiconductor X-400.",
        "timestamp": "12 min ago",
        "timeGroup": "TODAY",
        "productId": "1",
        "productName": "Semiconductor X-400",
        "sku": "SEM-1042",
        "location": "Hyderabad DC",
        "supplierId": "1",
        "supplierName": "Silicon Dynamics",
        "action": "ORDER",
        "quantity": 250,
        "confidence": 91,
        "humanDecision": "APPROVED",
        "originalAiRecommendation": "ORDER 250 units via Silicon Dynamics",
    },
    {
        "id": "act-103",
        "type": "ALERT",
        "actor": "System",
        "title": "Supply Risk Alert Triggered",
        "description": "Supplier lead time flagged for Overseas Motor Controller shipment SUP-2088 (lead time 10 days).",
        "timestamp": "1 hour ago",
        "timeGroup": "TODAY",
        "productId": "2",
        "productName": "Li-Ion Battery Pack 5000mAh",
        "sku": "BAT-2041",
        "location": "Bangalore DC",
        "supplierId": "2",
        "supplierName": "VoltCharge Energy",
    },
    {
        "id": "act-104",
        "type": "SIMULATION",
        "actor": "Simulation Engine",
        "title": "Policy Simulation Completed",
        "description": "Executed 30-day policy simulation comparing RL Agent vs Heuristic vs Manual. RL Agent won with 84.5% service level.",
        "timestamp": "2 hours ago",
        "timeGroup": "TODAY",
        "simulationId": "sim-run-demo",
        "simulationMetrics": {
            "durationDays": 30,
            "policiesEvaluated": ["AI RL-Agent", "Dynamic Heuristic", "Manual Ordering"],
            "winnerPolicy": "AI RL-Agent",
            "serviceLevel": 84.5,
            "projectedProfit": -73152.74,
            "stockoutRate": 3.15,
        },
    },
]


def add_activity_log(item: dict):
    """Prepend a new activity log entry to the backend log store."""
    ACTIVITY_LOGS.insert(0, item)


@router.get("")
def get_activity_logs(
    type_filter: Optional[str] = "ALL",
    date_filter: Optional[str] = "ALL",
    db: Session = Depends(get_db),
):
    """Retrieve system activity logs and operational audit events."""
    if type_filter and type_filter != "ALL":
        return [act for act in ACTIVITY_LOGS if act.get("type") == type_filter]
    return ACTIVITY_LOGS

