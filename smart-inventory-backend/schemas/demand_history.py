from datetime import date as PyDate
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DemandHistoryBase(BaseModel):
    product_id: int = Field(..., description="ID of the referenced product")
    date: PyDate = Field(..., description="Date of historical demand entry")
    demand_quantity: int = Field(
        ..., ge=0, description="Non-negative daily demand quantity"
    )


class DemandHistoryCreate(DemandHistoryBase):
    """Schema for creating a new DemandHistory record."""

    pass


class DemandHistoryUpdate(BaseModel):
    """Schema for updating an existing DemandHistory record with optional fields."""

    product_id: Optional[int] = None
    date: Optional[PyDate] = None
    demand_quantity: Optional[int] = Field(None, ge=0)


class DemandHistoryResponse(DemandHistoryBase):
    """Schema for DemandHistory record response output."""

    id: int

    model_config = ConfigDict(from_attributes=True)
