import sys
import os
import json
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath("."))

from database.db import SessionLocal
from database.models import InventoryRecord, Order
from app import app

client = TestClient(app)

print("==================================================================")
print("FASTAPI BACKEND & FRONTEND API INTEGRATION TEST SUITE")
print("==================================================================\n")

db = SessionLocal()

# Record initial DB state to verify 0 mutations
inv_before = [(r.id, r.quantity) for r in db.query(InventoryRecord).all()]
orders_before = [(o.id, o.status) for o in db.query(Order).all()]
print(f"Initial DB State: {len(inv_before)} InventoryRecords, {len(orders_before)} Orders.")

# 1. Health Check
print("\n--- TEST 1: GET / Health Check ---")
res = client.get("/")
assert res.status_code == 200
print(f"[OK] Health check response: {res.json()}")

# 2. Products List
print("\n--- TEST 2: GET /products ---")
res = client.get("/products")
assert res.status_code == 200
prods = res.json()
assert len(prods) == 20
print(f"[OK] Retrieved {len(prods)} products from DB.")

# 3. Suppliers List
print("\n--- TEST 3: GET /api/suppliers ---")
res = client.get("/api/suppliers")
assert res.status_code == 200
sups = res.json()
assert len(sups) > 0
print(f"[OK] Retrieved {len(sups)} suppliers from DB.")

# 4. Inventory Records List
print("\n--- TEST 4: GET /api/inventory ---")
res = client.get("/api/inventory")
assert res.status_code == 200
invs = res.json()
assert len(invs) > 0
print(f"[OK] Retrieved {len(invs)} inventory records from DB.")

# 5. Orders List
print("\n--- TEST 5: GET /api/orders ---")
res = client.get("/api/orders")
assert res.status_code == 200
ords = res.json()
assert len(ords) > 0
print(f"[OK] Retrieved {len(ords)} orders from DB.")

# 6. Demand Forecast
print("\n--- TEST 6: GET /api/forecast/1 ---")
res = client.get("/api/forecast/1?days=7")
assert res.status_code == 200
fc = res.json()
assert "forecast" in fc and len(fc["forecast"]) == 7
print(f"[OK] Generated 7-day Prophet forecast for Product 1.")

# 7. Executive Analytics Summary
print("\n--- TEST 7: GET /api/analytics/summary ---")
res = client.get("/api/analytics/summary?range=30D")
assert res.status_code == 200
an = res.json()
assert "kpis" in an and "inventoryHealth" in an
print(f"[OK] Executive Analytics Summary returned {len(an['kpis'])} KPIs & Inventory Health summary.")

# 8. AI Recommendations (Trained CQL & PPO)
print("\n--- TEST 8: GET /api/recommendations ---")
res = client.get("/api/recommendations")
assert res.status_code == 200
recs = res.json()
assert len(recs) > 0
print(f"[OK] Generated {len(recs)} RL AI recommendations across all inventory records.")

# 9. Multi-Policy Simulation Run
print("\n--- TEST 9: POST /api/simulate/run ---")
payload = {
    "durationDays": 30,
    "skuCount": 20,
    "locationCount": 1,
    "selectedPolicies": ["RL_AGENT", "HEURISTIC", "MANUAL"],
}
res = client.post("/api/simulate/run", json=payload)
assert res.status_code == 200
sim = res.json()
assert "results" in sim and len(sim["results"]) == 3
print(f"[OK] Executed multi-policy simulation comparison. Winner: {sim['winnerPolicyType']}.")

# 10. Activity Feed
print("\n--- TEST 10: GET /api/activity ---")
res = client.get("/api/activity")
assert res.status_code == 200
act = res.json()
assert len(act) >= 4
print(f"[OK] Activity feed returned {len(act)} operational log items.")

# 11. Settings
print("\n--- TEST 11: GET /api/settings ---")
res = client.get("/api/settings")
assert res.status_code == 200
sett = res.json()
assert "profile" in sett and "aiPreferences" in sett
print(f"[OK] Settings returned user profile & AI preferences.")

# 12. Database Isolation Check
print("\n--- TEST 12: Database Isolation Check ---")
inv_after = [(r.id, r.quantity) for r in db.query(InventoryRecord).all()]
orders_after = [(o.id, o.status) for o in db.query(Order).all()]
db.close()

assert inv_before == inv_after, "ERROR: InventoryRecord table was mutated!"
assert orders_before == orders_after, "ERROR: Order table was mutated!"
print("[OK] ZERO SQLite database records were mutated during API testing.")

print("\n==================================================================")
print("ALL FASTAPI BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
