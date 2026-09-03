import urllib.request
import urllib.error
import json

base_url = 'http://127.0.0.1:8000'

# Health check
req = urllib.request.urlopen(base_url + '/')
assert req.status == 200
print('Root health check:', json.loads(req.read().decode('utf-8')))

# 1. GET /api/forecast/1?days=7
req = urllib.request.urlopen(base_url + '/api/forecast/1?days=7')
assert req.status == 200
forecast_data = json.loads(req.read().decode('utf-8'))
print('GET /api/forecast/1?days=7 response:')
print(f"  Product: {forecast_data['product_name']} (ID: {forecast_data['product_id']})")
print(f"  Forecast Horizon: {forecast_data['forecast_horizon_days']} days")
print(f"  First prediction: {forecast_data['forecast'][0]}")
assert forecast_data['product_id'] == 1
assert forecast_data['forecast_horizon_days'] == 7
assert len(forecast_data['forecast']) == 7
for item in forecast_data['forecast']:
    assert item['predicted_demand'] >= 0.0
    assert item['lower_bound'] >= 0.0
    assert item['upper_bound'] >= 0.0
print('-> GET /api/forecast/1 verified successfully!')

# 2. GET /api/forecast/1/evaluate
req = urllib.request.urlopen(base_url + '/api/forecast/1/evaluate')
assert req.status == 200
eval_data = json.loads(req.read().decode('utf-8'))
print('GET /api/forecast/1/evaluate response:')
print(f"  Product: {eval_data['product_name']}, MAE: {eval_data['mae']}")
assert eval_data['product_id'] == 1
assert eval_data['holdout_days'] == 30
assert isinstance(eval_data['mae'], float) and eval_data['mae'] >= 0.0
print('-> GET /api/forecast/1/evaluate verified successfully!')

# 3. GET /api/forecast/99999 (Invalid product_id)
try:
    urllib.request.urlopen(base_url + '/api/forecast/99999')
    assert False, 'Expected 404'
except urllib.error.HTTPError as err:
    assert err.code == 404
    print(f'-> Invalid product_id handled correctly with HTTP {err.code}')

# 4. Verify existing endpoints still work
assert urllib.request.urlopen(base_url + '/products').status == 200
assert urllib.request.urlopen(base_url + '/api/suppliers').status == 200
assert urllib.request.urlopen(base_url + '/api/inventory').status == 200
assert urllib.request.urlopen(base_url + '/api/orders').status == 200
assert urllib.request.urlopen(base_url + '/api/demand-history?limit=5').status == 200

print('ALL LIVE FASTAPI HTTP FORECASTING ENDPOINTS VERIFIED SUCCESSFULLY!')
