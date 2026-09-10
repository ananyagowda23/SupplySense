from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Supplier
from schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from utils.helpers import dump_model
from utils.security import get_current_tenant, require_permission

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.get("", response_model=List[SupplierResponse])
def get_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("suppliers.read")),
):
    """Retrieve a list of all suppliers for the active organization with optional pagination."""
    _, current_org = auth_data
    return (
        db.query(Supplier)
        .filter(Supplier.organization_id == current_org.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("suppliers.read")),
):
    """Retrieve a single supplier by ID within the active organization."""
    _, current_org = auth_data
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id, Supplier.organization_id == current_org.id)
        .first()
    )
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with ID {supplier_id} not found",
        )
    return supplier


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("suppliers.write")),
):
    """Create a new supplier within the active organization."""
    _, current_org = auth_data
    supplier_dict = dump_model(supplier)
    supplier_dict["organization_id"] = current_org.id
    db_supplier = Supplier(**supplier_dict)
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    supplier_update: SupplierUpdate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("suppliers.write")),
):
    """Update an existing supplier by ID within the active organization."""
    _, current_org = auth_data
    db_supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id, Supplier.organization_id == current_org.id)
        .first()
    )
    if not db_supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with ID {supplier_id} not found",
        )

    update_data = dump_model(supplier_update, exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_supplier, field, value)

    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("suppliers.write")),
):
    """Delete a supplier by ID within the active organization."""
    _, current_org = auth_data
    db_supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id, Supplier.organization_id == current_org.id)
        .first()
    )
    if not db_supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier with ID {supplier_id} not found",
        )

    db.delete(db_supplier)
    db.commit()
    return None
