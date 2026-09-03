import urllib.request
import urllib.error
import json

base_url = 'http://127.0.0.1:8000'

# Health check
req = urllib.request.urlopen(base_url + '/')
assert req.status == 200
print('Root health check:', json.loads(req.read().decode('utf-8')))

# 1. POST /api/simulate with sequential daily actions array
payload_sequential = json.dumps({
    'product_id': 1,
    'initial_inventory': 50,
    'simulation_days': 5,
    'actions': [
        {'action': 1, 'order_quantity': 40}, # Day 1: ORDER 40
        {'action': 0},                        # Day 2: NOOP
        {'action': 0},                        # Day 3: NOOP
        {'action': 1, 'order_quantity': 60}, # Day 4: ORDER 60
        {'action': 0}                         # Day 5: NOOP
    ]
}).encode('utf-8')

post_req = urllib.request.Request(
    base_url + '/api/simulate',
    data=payload_sequential,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

res = urllib.request.urlopen(post_req)
assert res.status == 200
data_sim = json.loads(res.read().decode('utf-8'))
print('POST /api/simulate (Sequential Actions) response:')
print(f"  Product: {data_sim['product_name']} (ID: {data_sim['product_id']})")
print(f"  Simulation Days: {data_sim['simulation_days']}")

daily = data_sim['daily_results']
assert len(daily) == 5
assert daily[0]['action_taken'] == 'ORDER' and daily[0]['order_quantity_placed'] == 40
assert daily[1]['action_taken'] == 'NOOP' and daily[1]['order_quantity_placed'] == 0
assert daily[2]['action_taken'] == 'NOOP' and daily[2]['order_quantity_placed'] == 0
assert daily[3]['action_taken'] == 'ORDER' and daily[3]['order_quantity_placed'] == 60
assert daily[4]['action_taken'] == 'NOOP' and daily[4]['order_quantity_placed'] == 0

print('-> Sequential actions per-day API test passed!')

# 2. Check Swagger OpenAPI docs JSON to verify schema exposure
docs_req = urllib.request.urlopen(base_url + '/openapi.json')
assert docs_req.status == 200
openapi_spec = json.loads(docs_req.read().decode('utf-8'))
schemas = openapi_spec['components']['schemas']
assert 'DailyAction' in schemas
assert 'SimulationRequest' in schemas
print('-> Swagger OpenAPI docs verified: DailyAction and SimulationRequest schemas exposed!')

print('ALL SEQUENTIAL SIMULATION HTTP TESTS PASSED SUCCESSFULLY!')
