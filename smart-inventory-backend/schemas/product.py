from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(..., description="Name of the product")
    sku: str = Field(..., description="Stock Keeping Unit (unique identifier)")
    category: str = Field(..., description="Category of the product")
    unit_price: float = Field(..., ge=0.0, description="Price per unit")


class ProductCreate(ProductBase):
    """Schema for creating a new Product."""

    pass


class ProductUpdate(BaseModel):
    """Schema for updating an existing Product with optional fields."""

    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit_price: Optional[float] = Field(None, ge=0.0)


class ProductResponse(ProductBase):
    """Schema for Product responses including the auto-generated ID."""

    id: int

    model_config = ConfigDict(from_attributes=True)
