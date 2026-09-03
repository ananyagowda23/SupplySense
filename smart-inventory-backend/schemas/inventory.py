from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class InventoryBase(BaseModel):
    product_id: int = Field(..., description="ID of the referenced product")
    location: str = Field(..., description="Warehouse or stock location")
    quantity: int = Field(0, ge=0, description="Available stock quantity")
    reorder_point: int = Field(0, ge=0, description="Stock level threshold to trigger reorder")
    safety_stock: int = Field(0, ge=0, description="Minimum safety stock buffer")


class InventoryCreate(InventoryBase):
    """Schema for creating a new Inventory record."""

    pass


class InventoryUpdate(BaseModel):
    """Schema for updating an existing Inventory record with optional fields."""

    product_id: Optional[int] = None
    location: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    reorder_point: Optional[int] = Field(None, ge=0)
    safety_stock: Optional[int] = Field(None, ge=0)


class InventoryResponse(InventoryBase):
    """Schema for Inventory record response output."""

    id: int

    model_config = ConfigDict(from_attributes=True)
