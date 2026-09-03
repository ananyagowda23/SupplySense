import urllib.request
import urllib.error
import json

base_url = 'http://127.0.0.1:8000'

# Health check
req = urllib.request.urlopen(base_url + '/')
assert req.status == 200
print('Root health check:', json.loads(req.read().decode('utf-8')))

# 1. POST /api/simulate
payload_simulate = json.dumps({
    'product_id': 1,
    'initial_inventory': 50,
    'simulation_days': 7,
    'action': 0, # NOOP
    'order_quantity': 0
}).encode('utf-8')

post_req = urllib.request.Request(
    base_url + '/api/simulate',
    data=payload_simulate,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

res = urllib.request.urlopen(post_req)
assert res.status == 200
data_sim = json.loads(res.read().decode('utf-8'))
print('POST /api/simulate response:')
print(f"  Product: {data_sim['product_name']} (ID: {data_sim['product_id']})")
print(f"  Initial Inv: {data_sim['initial_inventory']} -> Final Inv: {data_sim['final_inventory']}")
print(f"  Service Level: {data_sim['service_level_percentage']}% | Total Profit: ${data_sim['total_profit']}")
assert data_sim['product_id'] == 1
assert data_sim['simulation_days'] == 7
assert len(data_sim['daily_results']) == 7
print('-> POST /api/simulate verified successfully!')

# 2. POST /api/simulate/scenario (Compare NOOP vs ORDER 50)
payload_scenario = json.dumps({
    'scenarios': [
        {
            'product_id': 1,
            'initial_inventory': 50,
            'simulation_days': 7,
            'action': 0, # NOOP
            'order_quantity': 0
        },
        {
            'product_id': 1,
            'initial_inventory': 50,
            'simulation_days': 7,
            'action': 1, # ORDER
            'order_quantity': 50
        }
    ]
}).encode('utf-8')

scen_req = urllib.request.Request(
    base_url + '/api/simulate/scenario',
    data=payload_scenario,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

res_scen = urllib.request.urlopen(scen_req)
assert res_scen.status == 200
data_scen = json.loads(res_scen.read().decode('utf-8'))
print('POST /api/simulate/scenario response:')
assert 'comparison' in data_scen
comp = data_scen['comparison']
assert len(comp) == 2
print(f"  Scenario A (NOOP) Profit: ${comp[0]['total_profit']} | Service Level: {comp[0]['service_level_percentage']}%")
print(f"  Scenario B (ORDER 50) Profit: ${comp[1]['total_profit']} | Service Level: {comp[1]['service_level_percentage']}%")
print('-> POST /api/simulate/scenario verified successfully!')

# 3. Verify existing endpoints still work
assert urllib.request.urlopen(base_url + '/products').status == 200
assert urllib.request.urlopen(base_url + '/api/suppliers').status == 200
assert urllib.request.urlopen(base_url + '/api/inventory').status == 200
assert urllib.request.urlopen(base_url + '/api/orders').status == 200
assert urllib.request.urlopen(base_url + '/api/demand-history?limit=5').status == 200
assert urllib.request.urlopen(base_url + '/api/forecast/1?days=7').status == 200

print('ALL SIMULATION REST API HTTP ENDPOINTS VERIFIED SUCCESSFULLY!')
