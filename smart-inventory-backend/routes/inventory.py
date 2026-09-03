from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import InventoryRecord, Product
from schemas.inventory import (
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
)

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def _dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


@router.get("", response_model=List[InventoryResponse])
def get_inventory_records(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """Retrieve a list of inventory records with optional pagination."""
    return db.query(InventoryRecord).offset(skip).limit(limit).all()


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory_record(inventory_id: int, db: Session = Depends(get_db)):
    """Retrieve a single inventory record by ID."""
    record = (
        db.query(InventoryRecord)
        .filter(InventoryRecord.id == inventory_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found",
        )
    return record


@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_record(
    record: InventoryCreate, db: Session = Depends(get_db)
):
    """Create a new inventory record for a product."""
    product = db.query(Product).filter(Product.id == record.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with ID {record.product_id} does not exist",
        )

    db_record = InventoryRecord(**_dump(record))
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@router.put("/{inventory_id}", response_model=InventoryResponse)
def update_inventory_record(
    inventory_id: int,
    record_update: InventoryUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing inventory record by ID."""
    db_record = (
        db.query(InventoryRecord)
        .filter(InventoryRecord.id == inventory_id)
        .first()
    )
    if not db_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found",
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


@router.delete("/{inventory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_record(inventory_id: int, db: Session = Depends(get_db)):
    """Delete an inventory record by ID."""
    db_record = (
        db.query(InventoryRecord)
        .filter(InventoryRecord.id == inventory_id)
        .first()
    )
    if not db_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found",
        )

    db.delete(db_record)
    db.commit()
    return None
