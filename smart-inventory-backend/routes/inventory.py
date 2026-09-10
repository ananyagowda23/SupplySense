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
from utils.helpers import dump_model
from utils.security import get_current_tenant, require_permission

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("", response_model=List[InventoryResponse])
def get_inventory_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("inventory.read")),
):
    """Retrieve a list of inventory records for the active organization with optional pagination."""
    _, current_org = auth_data
    return (
        db.query(InventoryRecord)
        .filter(InventoryRecord.organization_id == current_org.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{inventory_id}", response_model=InventoryResponse)
def get_inventory_record(
    inventory_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("inventory.read")),
):
    """Retrieve a single inventory record by ID within the active organization."""
    _, current_org = auth_data
    record = (
        db.query(InventoryRecord)
        .filter(
            InventoryRecord.id == inventory_id,
            InventoryRecord.organization_id == current_org.id,
        )
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
    record: InventoryCreate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("inventory.write")),
):
    """Create a new inventory record for a product within the active organization."""
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
    db_record = InventoryRecord(**record_dict)
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@router.put("/{inventory_id}", response_model=InventoryResponse)
def update_inventory_record(
    inventory_id: int,
    record_update: InventoryUpdate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("inventory.write")),
):
    """Update an existing inventory record by ID within the active organization."""
    _, current_org = auth_data
    db_record = (
        db.query(InventoryRecord)
        .filter(
            InventoryRecord.id == inventory_id,
            InventoryRecord.organization_id == current_org.id,
        )
        .first()
    )
    if not db_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory record with ID {inventory_id} not found",
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

    for field, value in update_data.items():
        setattr(db_record, field, value)

    db.commit()
    db.refresh(db_record)
    return db_record


@router.delete("/{inventory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_record(
    inventory_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("inventory.write")),
):
    """Delete an inventory record by ID within the active organization."""
    _, current_org = auth_data
    db_record = (
        db.query(InventoryRecord)
        .filter(
            InventoryRecord.id == inventory_id,
            InventoryRecord.organization_id == current_org.id,
        )
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
