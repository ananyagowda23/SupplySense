import logging
import warnings
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
import pandas as pd
from sqlalchemy.orm import Session

# Suppress verbose warnings and logs
warnings.filterwarnings("ignore")
logging.getLogger("prophet").setLevel(logging.ERROR)
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
logging.getLogger("stanio").setLevel(logging.ERROR)

from database.models import DemandHistory, Product

# In-memory forecast cache keyed by (organization_id, product_id, history_count)
_FORECAST_CACHE: Dict[tuple, Dict[str, Any]] = {}
logger = logging.getLogger(__name__)


def invalidate_forecast_cache(product_id: Optional[int] = None):
    """Invalidate forecast cache for a specific product_id or clear entire cache."""
    global _FORECAST_CACHE
    if product_id is not None:
        keys_to_remove = [k for k in _FORECAST_CACHE.keys() if len(k) >= 2 and k[1] == product_id]
        for key in keys_to_remove:
            _FORECAST_CACHE.pop(key, None)
    else:
        _FORECAST_CACHE.clear()


def generate_forecast(
    db: Session, product_id: int, days: int = 7, organization_id: Optional[str] = None
) -> Dict[str, Any]:
    """Train Prophet model on historical demand data and generate future predictions."""
    # 1. Validate Product existence
    prod_query = db.query(Product).filter(Product.id == product_id)
    if organization_id:
        prod_query = prod_query.filter(Product.organization_id == str(organization_id))
    product = prod_query.first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )

    # 2. Retrieve DemandHistory records ordered by date
    history_query = db.query(DemandHistory).filter(DemandHistory.product_id == product_id)
    if organization_id:
        history_query = history_query.filter(DemandHistory.organization_id == str(organization_id))
    history = history_query.order_by(DemandHistory.date.asc()).all()

    if not history or len(history) < 14:
        found_count = len(history) if history else 0
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient demand history for product ID {product_id}. At least 14 days required, but found {found_count}.",
        )

    # 3. Check Cache
    cache_key = (str(organization_id) if organization_id else "default", product_id, len(history))
    if cache_key in _FORECAST_CACHE:
        full_result = _FORECAST_CACHE[cache_key]
        forecast_slice = full_result["forecast"][:days]
        return {
            "product_id": product.id,
            "product_name": product.name,
            "forecast_horizon_days": days,
            "forecast": forecast_slice,
        }

    try:
        from prophet import Prophet
    except ImportError:
        logger.exception("Prophet library import failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prophet library is not installed on the server.",
        )

    # 4. Prepare Prophet DataFrame (ds, y)
    df = pd.DataFrame(
        [{"ds": r.date, "y": float(r.demand_quantity)} for r in history]
    )

    # 5. Fit Prophet Model for up to 365 days
    fit_days = max(365, days)
    try:
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
        )
        model.fit(df)

        # 6. Predict Future Horizon
        future = model.make_future_dataframe(periods=fit_days)
        forecast_df = model.predict(future)

        # 7. Extract Future Days Predictions
        future_rows = forecast_df.tail(fit_days)
        forecast_items = []

        for _, row in future_rows.iterrows():
            yhat = max(0.0, round(float(row["yhat"]), 2))
            yhat_lower = max(0.0, round(float(row["yhat_lower"]), 2))
            yhat_upper = max(0.0, round(float(row["yhat_upper"]), 2))
            date_str = row["ds"].strftime("%Y-%m-%d")

            forecast_items.append(
                {
                    "date": date_str,
                    "predicted_demand": yhat,
                    "lower_bound": yhat_lower,
                    "upper_bound": yhat_upper,
                }
            )

        full_result = {
            "product_id": product.id,
            "product_name": product.name,
            "forecast_horizon_days": fit_days,
            "forecast": forecast_items,
        }

        # Cache full forecast result
        _FORECAST_CACHE[cache_key] = full_result

        return {
            "product_id": product.id,
            "product_name": product.name,
            "forecast_horizon_days": days,
            "forecast": forecast_items[:days],
        }

    except Exception as e:
        logger.exception(f"Prophet forecast fitting failed for product ID {product_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecasting model execution failed for product ID {product_id}: {str(e)}",
        )


def evaluate_forecast(
    db: Session, product_id: int, holdout_days: int = 30, organization_id: Optional[str] = None
) -> Dict[str, Any]:
    """Perform time-based holdout evaluation and compute Mean Absolute Error (MAE)."""
    # 1. Validate Product existence
    prod_query = db.query(Product).filter(Product.id == product_id)
    if organization_id:
        prod_query = prod_query.filter(Product.organization_id == str(organization_id))
    product = prod_query.first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )

    # 2. Retrieve DemandHistory records
    history_query = db.query(DemandHistory).filter(DemandHistory.product_id == product_id)
    if organization_id:
        history_query = history_query.filter(DemandHistory.organization_id == str(organization_id))
    history = history_query.order_by(DemandHistory.date.asc()).all()

    min_required = holdout_days + 14
    if not history or len(history) < min_required:
        found_count = len(history) if history else 0
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient historical data for evaluation. Required at least {min_required} days for a {holdout_days}-day holdout, but found {found_count}.",
        )

    try:
        from prophet import Prophet
    except ImportError:
        logger.exception("Prophet library import failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prophet library is not installed on the server.",
        )

    # 3. Perform Time-Based Holdout Split
    train_records = history[:-holdout_days]
    test_records = history[-holdout_days:]

    train_df = pd.DataFrame(
        [{"ds": r.date, "y": float(r.demand_quantity)} for r in train_records]
    )

    try:
        # 4. Train model on train_df
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
        )
        model.fit(train_df)

        # 5. Predict holdout period
        future = model.make_future_dataframe(periods=holdout_days)
        forecast_df = model.predict(future)

        # 6. Extract predictions for holdout period
        predicted_rows = forecast_df.tail(holdout_days)

        # 7. Compute Mean Absolute Error (MAE)
        actuals = [float(r.demand_quantity) for r in test_records]
        predictions = [
            max(0.0, float(r["yhat"])) for _, r in predicted_rows.iterrows()
        ]

        abs_errors = [abs(act - pred) for act, pred in zip(actuals, predictions)]
        mae = round(sum(abs_errors) / len(abs_errors), 2)

        return {
            "product_id": product.id,
            "product_name": product.name,
            "total_historical_days": len(history),
            "train_days": len(train_records),
            "holdout_days": holdout_days,
            "mae": mae,
            "explanation": (
                "MAE (Mean Absolute Error) measures the average absolute difference between "
                "actual observed demand and predicted demand during the holdout evaluation period. "
                "For example, an MAE of 4.5 means predictions deviate by an average of 4.5 units per day."
            ),
        }

    except Exception as e:
        logger.exception(f"Forecast evaluation failed for product ID {product_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecast evaluation failed for product ID {product_id}: {str(e)}",
        )
