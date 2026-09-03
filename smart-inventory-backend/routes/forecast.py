from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from database.db import get_db
from schemas.forecast import ForecastEvaluationResponse, ForecastResponse
from services.forecasting_service import evaluate_forecast, generate_forecast

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("/{product_id}", response_model=ForecastResponse)
def get_product_forecast(
    product_id: int,
    days: int = Query(7, ge=1, le=365, description="Number of future days to forecast"),
    db: Session = Depends(get_db),
):
    """Generate a demand forecast for a specified product using Prophet."""
    result = generate_forecast(db=db, product_id=product_id, days=days)
    return result


@router.get("/{product_id}/evaluate", response_model=ForecastEvaluationResponse)
def get_forecast_evaluation(
    product_id: int,
    holdout_days: int = Query(
        30, ge=7, le=90, description="Holdout evaluation period in days"
    ),
    db: Session = Depends(get_db),
):
    """Evaluate Prophet forecast performance using time-based holdout and compute MAE."""
    result = evaluate_forecast(db=db, product_id=product_id, holdout_days=holdout_days)
    return result
