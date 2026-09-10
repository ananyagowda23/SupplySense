from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Order, Product, Supplier
from schemas.order import OrderCreate, OrderResponse, OrderUpdate
from utils.helpers import dump_model
from utils.security import get_current_tenant, require_permission

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=List[OrderResponse])
def get_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("orders.read")),
):
    """Retrieve a list of purchase orders for the active organization with optional pagination."""
    _, current_org = auth_data
    return (
        db.query(Order)
        .filter(Order.organization_id == current_org.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("orders.read")),
):
    """Retrieve a single order by ID within the active organization."""
    _, current_org = auth_data
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.organization_id == current_org.id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found",
        )
    return order


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("orders.write")),
):
    """Create a new purchase order within the active organization."""
    _, current_org = auth_data

    # Verify referenced product belongs to current organization
    product = (
        db.query(Product)
        .filter(Product.id == order.product_id, Product.organization_id == current_org.id)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with ID {order.product_id} does not exist in your organization",
        )

    # Verify referenced supplier belongs to current organization
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == order.supplier_id, Supplier.organization_id == current_org.id)
        .first()
    )
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Supplier with ID {order.supplier_id} does not exist in your organization",
        )

    order_dict = dump_model(order)
    order_dict["organization_id"] = current_org.id
    db_order = Order(**order_dict)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("orders.write")),
):
    """Update an existing purchase order by ID within the active organization."""
    _, current_org = auth_data
    db_order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.organization_id == current_org.id)
        .first()
    )
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found",
        )

    update_data = dump_model(order_update, exclude_unset=True)

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

    if "supplier_id" in update_data:
        supplier = (
            db.query(Supplier)
            .filter(
                Supplier.id == update_data["supplier_id"],
                Supplier.organization_id == current_org.id,
            )
            .first()
        )
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supplier with ID {update_data['supplier_id']} does not exist in your organization",
            )

    for field, value in update_data.items():
        setattr(db_order, field, value)

    db.commit()
    db.refresh(db_order)
    return db_order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("orders.write")),
):
    """Delete an order by ID within the active organization."""
    _, current_org = auth_data
    db_order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.organization_id == current_org.id)
        .first()
    )
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found",
        )

    db.delete(db_order)
    db.commit()
    return None
