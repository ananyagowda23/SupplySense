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
print("END-TO-END RECOMMENDATION APPROVAL & ACTIVITY AUDIT TEST SUITE")
print("==================================================================\n")

db = SessionLocal()

# Record initial DB state to verify 0 mutations
inv_before = [(r.id, r.quantity) for r in db.query(InventoryRecord).all()]
orders_before = [(o.id, o.status) for o in db.query(Order).all()]
print(f"Initial DB State: {len(inv_before)} InventoryRecords, {len(orders_before)} Orders.")

# Step 1: Fetch recommendations
print("\n--- STEP 1: GET /api/recommendations ---")
res = client.get("/api/recommendations")
assert res.status_code == 200
recs = res.json()
target_rec = recs[0]
target_id = target_rec["id"]
print(f"[OK] Retrieved {len(recs)} recommendations. Target recommendation: {target_id} (Initial state: {target_rec['decisionState']}).")

# Step 2: Submit APPROVED decision
print(f"\n--- STEP 2: POST /api/recommendations/{target_id}/decision (APPROVED) ---")
payload = {
    "decision": "APPROVED",
    "decisionNotes": "Approved by Operations Lead via physical phone.",
}
res = client.post(f"/api/recommendations/{target_id}/decision", json=payload)
assert res.status_code == 200
post_res = res.json()
assert post_res["status"] == "success"
assert post_res["decision"] == "APPROVED"
print(f"[OK] Backend decision endpoint returned success: {post_res['message']}")

# Step 3: Verify GET /api/recommendations reflects APPROVED state
print(f"\n--- STEP 3: Verify GET /api/recommendations reflects APPROVED state ---")
res = client.get("/api/recommendations")
assert res.status_code == 200
updated_recs = res.json()
updated_target = next(r for r in updated_recs if r["id"] == target_id)
assert updated_target["decisionState"] == "APPROVED"
assert updated_target["decisionNotes"] == "Approved by Operations Lead via physical phone."
print(f"[OK] Recommendation {target_id} now has decisionState = APPROVED in backend.")

# Step 4: Verify GET /api/activity contains the approval log item
print("\n--- STEP 4: GET /api/activity Audit Feed Verification ---")
res = client.get("/api/activity")
assert res.status_code == 200
activities = res.json()
approved_act = next((a for a in activities if a.get("recommendationId") == target_id or a.get("humanDecision") == "APPROVED"), None)
assert approved_act is not None, "ERROR: Approval event was not found in /api/activity!"
assert approved_act["humanDecision"] == "APPROVED"
print(f"[OK] Activity feed successfully recorded approval item: '{approved_act['title']}' ({approved_act['description']}).")

# Step 5: Verify 0 database mutations
print("\n--- STEP 5: Database Isolation Check ---")
inv_after = [(r.id, r.quantity) for r in db.query(InventoryRecord).all()]
orders_after = [(o.id, o.status) for o in db.query(Order).all()]
db.close()

assert inv_before == inv_after, "ERROR: InventoryRecord table was mutated!"
assert orders_before == orders_after, "ERROR: Order table was mutated!"
print("[OK] ZERO SQLite database records were mutated during recommendation approval.")

print("\n==================================================================")
print("END-TO-END RECOMMENDATION APPROVAL WORKFLOW VERIFIED SUCCESSFULLY!")
print("==================================================================")
