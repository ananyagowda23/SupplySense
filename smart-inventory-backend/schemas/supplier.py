from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SupplierBase(BaseModel):
    name: str = Field(..., description="Name of the supplier")
    location: str = Field(..., description="Location/city of the supplier")
    lead_time_days: int = Field(0, ge=0, description="Lead time in days for order fulfillment")
    reliability_score: float = Field(
        1.0, ge=0.0, le=1.0, description="Supplier reliability rating between 0.0 and 1.0"
    )


class SupplierCreate(SupplierBase):
    """Schema for creating a new Supplier."""

    pass


class SupplierUpdate(BaseModel):
    """Schema for updating an existing Supplier with optional fields."""

    name: Optional[str] = None
    location: Optional[str] = None
    lead_time_days: Optional[int] = Field(None, ge=0)
    reliability_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class SupplierResponse(SupplierBase):
    """Schema for Supplier response output."""

    id: int

    model_config = ConfigDict(from_attributes=True)
