from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Organization, Product
from schemas.product import ProductCreate, ProductResponse, ProductUpdate
from utils.helpers import dump_model
from utils.security import get_current_tenant, require_permission

router = APIRouter(prefix="/api/products", tags=["products"])
legacy_router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductResponse])
@legacy_router.get("", response_model=List[ProductResponse], include_in_schema=False)
def get_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("products.read")),
):
    """Retrieve a list of all products for the active organization with optional pagination."""
    _, current_org = auth_data
    products = (
        db.query(Product)
        .filter(Product.organization_id == current_org.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return products


@router.get("/{product_id}", response_model=ProductResponse)
@legacy_router.get("/{product_id}", response_model=ProductResponse, include_in_schema=False)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("products.read")),
):
    """Retrieve a single product by its ID within the active organization."""
    _, current_org = auth_data
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.organization_id == current_org.id)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )
    return product


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@legacy_router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("products.write")),
):
    """Create a new product within the active organization."""
    _, current_org = auth_data
    existing_product = (
        db.query(Product)
        .filter(Product.organization_id == current_org.id, Product.sku == product.sku)
        .first()
    )
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product.sku}' already exists in your organization",
        )

    product_dict = dump_model(product)
    product_dict["organization_id"] = current_org.id
    db_product = Product(**product_dict)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.put("/{product_id}", response_model=ProductResponse)
@legacy_router.put("/{product_id}", response_model=ProductResponse, include_in_schema=False)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("products.write")),
):
    """Update an existing product by its ID within the active organization."""
    _, current_org = auth_data
    db_product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.organization_id == current_org.id)
        .first()
    )
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )

    update_data = dump_model(product_update, exclude_unset=True)

    if "sku" in update_data and update_data["sku"] != db_product.sku:
        existing_sku = (
            db.query(Product)
            .filter(Product.organization_id == current_org.id, Product.sku == update_data["sku"])
            .first()
        )
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with SKU '{update_data['sku']}' already exists in your organization",
            )

    for field, value in update_data.items():
        setattr(db_product, field, value)

    db.commit()
    db.refresh(db_product)
    return db_product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
@legacy_router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, include_in_schema=False)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    auth_data=Depends(require_permission("products.write")),
):
    """Delete a product by its ID within the active organization."""
    _, current_org = auth_data
    db_product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.organization_id == current_org.id)
        .first()
    )
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )

    db.delete(db_product)
    db.commit()
    return None
