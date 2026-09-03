import sys
import os
sys.path.insert(0, os.path.abspath("."))

from database.db import SessionLocal
from services.forecasting_service import generate_forecast, evaluate_forecast
from fastapi import HTTPException

db = SessionLocal()

# 1. Generate 7-day forecast for Product 1
forecast_res = generate_forecast(db=db, product_id=1, days=7)
print("Forecast result for Product 1:")
print(f"Product ID: {forecast_res['product_id']}, Name: {forecast_res['product_name']}, Horizon: {forecast_res['forecast_horizon_days']}")
assert forecast_res['product_id'] == 1
assert forecast_res['forecast_horizon_days'] == 7
items = forecast_res['forecast']
assert len(items) == 7
for item in items:
    print("  -", item)
    assert item['predicted_demand'] >= 0.0, f"Negative prediction found: {item}"
    assert item['lower_bound'] >= 0.0
    assert item['upper_bound'] >= 0.0

print("-> 7-day forecast verified successfully!")

# 2. Test invalid product ID (99999) error handling
try:
    generate_forecast(db=db, product_id=99999, days=7)
    assert False, "Expected 404 HTTPException for invalid product ID"
except HTTPException as exc:
    assert exc.status_code == 404
    print(f"-> Invalid product ID handled correctly: HTTP {exc.status_code} - {exc.detail}")

# 3. Test Evaluation Endpoint logic for Product 1 (30-day holdout)
eval_res = evaluate_forecast(db=db, product_id=1, holdout_days=30)
print("Evaluation result for Product 1:")
print(eval_res)
assert eval_res['product_id'] == 1
assert eval_res['total_historical_days'] == 365
assert eval_res['train_days'] == 335
assert eval_res['holdout_days'] == 30
assert isinstance(eval_res['mae'], float) and eval_res['mae'] >= 0.0
assert 'explanation' in eval_res

print("-> Forecast evaluation (MAE) verified successfully!")

db.close()
print("ALL FORECASTING SERVICE TESTS PASSED!")
