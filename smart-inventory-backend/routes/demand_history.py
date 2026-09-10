from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import DemandHistory, Product
from schemas.demand_history import (
    DemandHistoryCreate,
    DemandHistoryResponse,
    DemandHistoryUpdate,
)
from services.forecasting_service import invalidate_forecast_cache
from utils.helpers import dump_model
from utils.security import get_current_tenant, require_permission

router = APIRouter(prefix="/api/demand-history", tags=["demand-history"])


@router.get("", response_model=List[DemandHistoryResponse])
def get_demand_history(
    product_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 10000,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("products.read")),
):
    """Retrieve historical demand records for the active organization with optional product filtering."""
    _, current_org = auth_data
    query = db.query(DemandHistory).filter(DemandHistory.organization_id == current_org.id)
    if product_id is not None:
        query = query.filter(DemandHistory.product_id == product_id)
    return query.order_by(DemandHistory.date.asc()).offset(skip).limit(limit).all()


@router.get("/{record_id}", response_model=DemandHistoryResponse)
def get_demand_history_record(
    record_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("products.read")),
):
    """Retrieve a single demand history record by ID within the active organization."""
    _, current_org = auth_data
    record = (
        db.query(DemandHistory)
        .filter(
            DemandHistory.id == record_id,
            DemandHistory.organization_id == current_org.id,
        )
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DemandHistory record with ID {record_id} not found",
        )
    return record


@router.post("", response_model=DemandHistoryResponse, status_code=status.HTTP_201_CREATED)
def create_demand_history_record(
    record: DemandHistoryCreate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("inventory.write")),
):
    """Create a new demand history record for a product within the active organization."""
    _, current_org = auth_data

    # Verify referenced product belongs to current organization
    product = (
        db.query(Product)
        .filter(Product.id == record.product_id, Product.organization_id == current_org.id)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with ID {record.product_id} does not exist in your organization",
        )

    record_dict = dump_model(record)
    record_dict["organization_id"] = current_org.id
    db_record = DemandHistory(**record_dict)
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    invalidate_forecast_cache(record.product_id)
    return db_record


@router.put("/{record_id}", response_model=DemandHistoryResponse)
def update_demand_history_record(
    record_id: int,
    record_update: DemandHistoryUpdate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("inventory.write")),
):
    """Update an existing demand history record by ID within the active organization."""
    _, current_org = auth_data
    db_record = (
        db.query(DemandHistory)
        .filter(
            DemandHistory.id == record_id,
            DemandHistory.organization_id == current_org.id,
        )
        .first()
    )
    if not db_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DemandHistory record with ID {record_id} not found",
        )

    update_data = dump_model(record_update, exclude_unset=True)

    if "product_id" in update_data:
        product = (
            db.query(Product)
            .filter(
                Product.id == update_data["product_id"],
                Product.organization_id == current_org.id,
            )
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with ID {update_data['product_id']} does not exist in your organization",
            )

    old_product_id = db_record.product_id
    for field, value in update_data.items():
        setattr(db_record, field, value)

    db.commit()
    db.refresh(db_record)
    invalidate_forecast_cache(old_product_id)
    if db_record.product_id != old_product_id:
        invalidate_forecast_cache(db_record.product_id)
    return db_record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_demand_history_record(
    record_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("inventory.write")),
):
    """Delete a demand history record by ID within the active organization."""
    _, current_org = auth_data
    db_record = (
        db.query(DemandHistory)
        .filter(
            DemandHistory.id == record_id,
            DemandHistory.organization_id == current_org.id,
        )
        .first()
    )
    if not db_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DemandHistory record with ID {record_id} not found",
        )

    product_id = db_record.product_id
    db.delete(db_record)
    db.commit()
    invalidate_forecast_cache(product_id)
    return None
