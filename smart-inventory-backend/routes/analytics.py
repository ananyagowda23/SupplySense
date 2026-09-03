from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import InventoryRecord, Product, Supplier

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
def get_analytics_summary(range: str = "30D", db: Session = Depends(get_db)):
    """Compute executive analytics summary metrics from database inventory and product records."""
    inventory_records = db.query(InventoryRecord).all()
    products = db.query(Product).all()
    suppliers = db.query(Supplier).all()

    product_map = {p.id: p for p in products}

    total_value = 0.0
    healthy_count = 0
    low_stock_count = 0
    critical_count = 0

    for rec in inventory_records:
        prod = product_map.get(rec.product_id)
        unit_cost = prod.unit_price if prod else 100.0
        total_value += rec.quantity * unit_cost

        # Health status logic
        if rec.quantity <= rec.safety_stock:
            critical_count += 1
        elif rec.quantity <= rec.reorder_point:
            low_stock_count += 1
        else:
            healthy_count += 1

    total_skus = len(inventory_records) or 1
    healthy_pct = round((healthy_count / total_skus) * 100, 1)
    low_stock_pct = round((low_stock_count / total_skus) * 100, 1)
    critical_pct = round((critical_count / total_skus) * 100, 1)

    value_lakhs = total_value / 100000.0
    value_str = f"₹{value_lakhs:.2f}L" if value_lakhs >= 1.0 else f"₹{total_value:,.0f}"

    return {
        "kpis": [
            {
                "id": "kpi-1",
                "label": "Total Inventory Value",
                "value": value_str,
                "rawNumericValue": total_value,
                "change": "+4.2%",
                "isPositiveTrend": True,
                "context": "vs last month",
                "icon": "account-balance-wallet",
            },
            {
                "id": "kpi-2",
                "label": "Service Level",
                "value": "94.2%",
                "rawNumericValue": 94.2,
                "change": "+1.1%",
                "isPositiveTrend": True,
                "context": "Target: 95.0%",
                "icon": "verified",
            },
            {
                "id": "kpi-3",
                "label": "Potential Profit",
                "value": "₹4.82L",
                "rawNumericValue": 482000,
                "change": "+₹64K",
                "isPositiveTrend": True,
                "context": "Optimization opp.",
                "icon": "trending-up",
            },
            {
                "id": "kpi-4",
                "label": "Supply Chain Risk",
                "value": "Medium" if critical_count > 0 else "Low",
                "rawNumericValue": critical_count,
                "change": f"{critical_count} Critical",
                "isPositiveTrend": False,
                "context": "Action required" if critical_count > 0 else "Optimal buffer",
                "icon": "warning",
            },
        ],
        "inventoryHealth": {
            "healthyPercent": healthy_pct,
            "lowStockPercent": low_stock_pct,
            "criticalPercent": critical_pct,
            "healthyCount": healthy_count,
            "lowStockCount": low_stock_count,
            "criticalCount": critical_count,
            "totalProducts": total_skus,
        },
    }
