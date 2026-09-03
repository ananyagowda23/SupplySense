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

router = APIRouter(prefix="/api/demand-history", tags=["demand-history"])


def _dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


@router.get("", response_model=List[DemandHistoryResponse])
def get_demand_history(
    product_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 10000,
    db: Session = Depends(get_db),
):
    """Retrieve historical demand records with optional filtering by product_id."""
    query = db.query(DemandHistory)
    if product_id is not None:
        query = query.filter(DemandHistory.product_id == product_id)
    return query.order_by(DemandHistory.date.asc()).offset(skip).limit(limit).all()


@router.get("/{record_id}", response_model=DemandHistoryResponse)
def get_demand_history_record(record_id: int, db: Session = Depends(get_db)):
    """Retrieve a single demand history record by ID."""
    record = (
        db.query(DemandHistory)
        .filter(DemandHistory.id == record_id)
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
    record: DemandHistoryCreate, db: Session = Depends(get_db)
):
    """Create a new demand history record for a product."""
    product = db.query(Product).filter(Product.id == record.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with ID {record.product_id} does not exist",
        )

    db_record = DemandHistory(**_dump(record))
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@router.put("/{record_id}", response_model=DemandHistoryResponse)
def update_demand_history_record(
    record_id: int,
    record_update: DemandHistoryUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing demand history record by ID."""
    db_record = (
        db.query(DemandHistory)
        .filter(DemandHistory.id == record_id)
        .first()
    )
    if not db_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DemandHistory record with ID {record_id} not found",
        )

    update_data = _dump(record_update, exclude_unset=True)

    if "product_id" in update_data:
        product = (
            db.query(Product)
            .filter(Product.id == update_data["product_id"])
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with ID {update_data['product_id']} does not exist",
            )

    for field, value in update_data.items():
        setattr(db_record, field, value)

    db.commit()
    db.refresh(db_record)
    return db_record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_demand_history_record(record_id: int, db: Session = Depends(get_db)):
    """Delete a demand history record by ID."""
    db_record = (
        db.query(DemandHistory)
        .filter(DemandHistory.id == record_id)
        .first()
    )
    if not db_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DemandHistory record with ID {record_id} not found",
        )

    db.delete(db_record)
    db.commit()
    return None
