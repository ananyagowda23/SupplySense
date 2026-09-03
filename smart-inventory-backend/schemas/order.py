from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class OrderBase(BaseModel):
    product_id: int = Field(..., description="ID of the ordered product")
    supplier_id: int = Field(..., description="ID of the fulfilling supplier")
    quantity: int = Field(..., gt=0, description="Quantity ordered")
    status: str = Field("PENDING", description="Order status (e.g. PENDING, SHIPPED, DELIVERED, CANCELLED)")
    order_date: date = Field(..., description="Date order was placed")
    expected_delivery_date: date = Field(..., description="Expected fulfillment date")


class OrderCreate(OrderBase):
    """Schema for creating a new purchase Order."""

    pass


class OrderUpdate(BaseModel):
    """Schema for updating an existing purchase Order with optional fields."""

    product_id: Optional[int] = None
    supplier_id: Optional[int] = None
    quantity: Optional[int] = Field(None, gt=0)
    status: Optional[str] = None
    order_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None


class OrderResponse(OrderBase):
    """Schema for Order response output."""

    id: int

    model_config = ConfigDict(from_attributes=True)
