import sys
import os
sys.path.insert(0, os.path.abspath("."))

from database.db import SessionLocal
from database.models import InventoryRecord, Order, Product, Supplier
from schemas.simulation import SimulationRequest, DailyAction
from services.simulation_service import run_simulation

db = SessionLocal()

print("==================================================================")
print("RUNNING SEQUENTIAL SUPPLY-CHAIN SIMULATION TEST SUITE")
print("==================================================================\n")

# Record Database State Before Tests
inv_before = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
orders_before = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]
print(f"Initial DB State: {len(inv_before)} InventoryRecords, {len(orders_before)} Orders.")

# ------------------------------------------------------------------
# CASE 1: All NOOP Actions
# ------------------------------------------------------------------
print("\n--- TEST CASE 1: All NOOP Actions ---")
req_case1 = SimulationRequest(
    product_id=1,
    initial_inventory=50,
    simulation_days=7,
    actions=[
        DailyAction(action=0),
        DailyAction(action=0),
        DailyAction(action=0),
        DailyAction(action=0),
        DailyAction(action=0),
        DailyAction(action=0),
        DailyAction(action=0),
    ]
)
res1 = run_simulation(db=db, request=req_case1)
assert len(res1.daily_results) == 7
for day_res in res1.daily_results:
    assert day_res.action_taken == "NOOP"
    assert day_res.order_quantity_placed == 0
    assert day_res.purchase_cost == 0.0
print("-> Case 1 Passed: All 7 days executed NOOP with 0 orders placed.")

# ------------------------------------------------------------------
# CASE 2: ORDER only on Day 1 followed by NOOP
# ------------------------------------------------------------------
print("\n--- TEST CASE 2: ORDER on Day 1 followed by NOOP ---")
req_case2 = SimulationRequest(
    product_id=1,
    initial_inventory=50,
    simulation_days=7,
    actions=[
        DailyAction(action=1, order_quantity=40),
        DailyAction(action=0),
        DailyAction(action=0),
        DailyAction(action=0),
        DailyAction(action=0),
        DailyAction(action=0),
        DailyAction(action=0),
    ]
)
res2 = run_simulation(db=db, request=req_case2)
assert res2.daily_results[0].action_taken == "ORDER"
assert res2.daily_results[0].order_quantity_placed == 40
assert res2.daily_results[0].purchase_cost > 0.0

for day_res in res2.daily_results[1:]:
    assert day_res.action_taken == "NOOP"
    assert day_res.order_quantity_placed == 0
    assert day_res.purchase_cost == 0.0
print("-> Case 2 Passed: Day 1 placed order for 40 units; Days 2..7 executed NOOP with 0 orders.")

# ------------------------------------------------------------------
# CASE 3: ORDER on two different days (Day 1 & Day 4) with NOOP in between
# ------------------------------------------------------------------
print("\n--- TEST CASE 3: ORDER on Day 1 and Day 4 with NOOP in between ---")
req_case3 = SimulationRequest(
    product_id=1,
    initial_inventory=50,
    simulation_days=7,
    actions=[
        DailyAction(action=1, order_quantity=40), # Day 1: ORDER 40
        DailyAction(action=0),                    # Day 2: NOOP
        DailyAction(action=0),                    # Day 3: NOOP
        DailyAction(action=1, order_quantity=60), # Day 4: ORDER 60
        DailyAction(action=0),                    # Day 5: NOOP
        DailyAction(action=0),                    # Day 6: NOOP
        DailyAction(action=0),                    # Day 7: NOOP
    ]
)
res3 = run_simulation(db=db, request=req_case3)

assert res3.daily_results[0].action_taken == "ORDER" and res3.daily_results[0].order_quantity_placed == 40
assert res3.daily_results[1].action_taken == "NOOP" and res3.daily_results[1].order_quantity_placed == 0
assert res3.daily_results[2].action_taken == "NOOP" and res3.daily_results[2].order_quantity_placed == 0
assert res3.daily_results[3].action_taken == "ORDER" and res3.daily_results[3].order_quantity_placed == 60
assert res3.daily_results[4].action_taken == "NOOP" and res3.daily_results[4].order_quantity_placed == 0

print("-> Case 3 Passed: Orders placed exclusively on Day 1 (40) and Day 4 (60). NOOP on intervening days.")

# ------------------------------------------------------------------
# CASE 4: Verify pending orders arrive according to supplier lead time
# ------------------------------------------------------------------
print("\n--- TEST CASE 4: Lead-time delivery verification ---")
# Get supplier for Product 1
p1 = db.query(Product).filter(Product.id == 1).first()
sup1 = db.query(Supplier).join(Order, Supplier.id == Order.supplier_id).filter(Order.product_id == 1).first()
if not sup1:
    sup1 = db.query(Supplier).first()

lead_time = sup1.lead_time_days
print(f"Supplier lead time for Product 1 is {lead_time} days.")

# Place order of 100 on Day 1 with initial_inventory = 10
sim_horizon = max(7, lead_time + 2)
req_case4 = SimulationRequest(
    product_id=1,
    initial_inventory=10,
    simulation_days=sim_horizon,
    actions=[DailyAction(action=1, order_quantity=100)] + [DailyAction(action=0) for _ in range(sim_horizon - 1)]
)
res4 = run_simulation(db=db, request=req_case4)

# Delivery should arrive on morning of Day (1 + lead_time)
arrival_day_idx = lead_time  # 0-indexed day when morning delivery arrives (e.g. lead_time 5 -> Day 6, idx 5)

day_before_arrival = res4.daily_results[arrival_day_idx - 1]
arrival_day = res4.daily_results[arrival_day_idx]

print(f"Day {arrival_day_idx} (Day before arrival) ending inventory: {day_before_arrival.ending_inventory}")
print(f"Day {arrival_day_idx + 1} (Arrival day) starting inventory: {arrival_day.starting_inventory}")

# Arrival day starting inventory must equal (day_before_arrival.ending_inventory + 100)
expected_starting_inv = day_before_arrival.ending_inventory + 100
assert arrival_day.starting_inventory == expected_starting_inv, f"Expected {expected_starting_inv}, got {arrival_day.starting_inventory}"
print(f"-> Case 4 Passed: 100-unit order arrived deterministically on Day {arrival_day_idx + 1} after {lead_time} days lead time!")

# ------------------------------------------------------------------
# CASE 5: Verify zero database mutations (Database Isolation)
# ------------------------------------------------------------------
print("\n--- TEST CASE 5: Database Isolation Verification ---")
inv_after = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
orders_after = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]

assert inv_before == inv_after, "ERROR: InventoryRecord table was modified by simulation!"
assert orders_before == orders_after, "ERROR: Order table was modified by simulation!"

print(f"Final DB State: {len(inv_after)} InventoryRecords, {len(orders_after)} Orders.")
print("-> Case 5 Passed: ZERO database records were created, modified, or deleted during simulation!")

db.close()

print("\n==================================================================")
print("ALL 5 SEQUENTIAL SIMULATION VERIFICATION TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
