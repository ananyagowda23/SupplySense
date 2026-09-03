from typing import List
from pydantic import BaseModel, Field


class ForecastItem(BaseModel):
    date: str = Field(..., description="Forecast date (YYYY-MM-DD)")
    predicted_demand: float = Field(
        ..., ge=0.0, description="Predicted daily demand quantity (clamped >= 0)"
    )
    lower_bound: float = Field(
        ..., ge=0.0, description="Lower confidence interval bound (clamped >= 0)"
    )
    upper_bound: float = Field(
        ..., ge=0.0, description="Upper confidence interval bound (clamped >= 0)"
    )


class ForecastResponse(BaseModel):
    product_id: int = Field(..., description="ID of the forecasted product")
    product_name: str = Field(..., description="Name of the forecasted product")
    forecast_horizon_days: int = Field(..., description="Number of forecasted future days")
    forecast: List[ForecastItem] = Field(..., description="Daily forecasted predictions")


class ForecastEvaluationResponse(BaseModel):
    product_id: int = Field(..., description="ID of the evaluated product")
    product_name: str = Field(..., description="Name of the evaluated product")
    total_historical_days: int = Field(..., description="Total available historical days")
    train_days: int = Field(..., description="Number of days used for model training")
    holdout_days: int = Field(..., description="Number of days in holdout evaluation set")
    mae: float = Field(..., description="Mean Absolute Error (average daily unit prediction error)")
    explanation: str = Field(..., description="Explanation of what MAE measures")
