import sys
import os
sys.path.insert(0, os.path.abspath("."))

from database.db import SessionLocal
from database.models import InventoryRecord
from schemas.simulation import SimulationRequest, ScenarioComparisonRequest
from services.simulation_service import run_simulation

db = SessionLocal()

# Record DB state before simulation
inv_before = db.query(InventoryRecord).filter(InventoryRecord.product_id == 1).all()
inv_before_state = [(r.id, r.quantity, r.location) for r in inv_before]
print("InventoryRecord before simulation:", inv_before_state)

# 1. Run 7-day simulation (Scenario A: NOOP)
req_noop = SimulationRequest(
    product_id=1,
    initial_inventory=50,
    simulation_days=7,
    action=0, # NOOP
    order_quantity=0
)

res_noop = run_simulation(db=db, request=req_noop)
print("\n--- Simulation Response (Scenario A: NOOP) ---")
print(f"Product: {res_noop.product_name} (ID: {res_noop.product_id})")
print(f"Horizon: {res_noop.simulation_days} days | Initial Inv: {res_noop.initial_inventory} | Final Inv: {res_noop.final_inventory}")
print(f"Total Demand: {res_noop.total_demand} | Fulfilled: {res_noop.total_fulfilled_demand} | Stockout: {res_noop.total_stockout_units}")
print(f"Service Level: {res_noop.service_level_percentage}% | Profit: ${res_noop.total_profit} | Reward: ${res_noop.cumulative_reward}")

assert res_noop.product_id == 1
assert res_noop.simulation_days == 7
assert len(res_noop.daily_results) == 7

for day_res in res_noop.daily_results:
    print(f"  Day {day_res.day} ({day_res.date}): Start={day_res.starting_inventory}, Demand={day_res.daily_demand}, Fulfilled={day_res.fulfilled_demand}, Stockout={day_res.stockout_quantity}, End={day_res.ending_inventory}, Profit=${day_res.daily_profit}")
    assert day_res.ending_inventory == int(day_res.starting_inventory - day_res.fulfilled_demand)
    assert len(day_res.numerical_observation) == 9

# 2. Run 7-day simulation (Scenario B: ORDER 60 units)
req_order = SimulationRequest(
    product_id=1,
    initial_inventory=20,
    simulation_days=7,
    action=1, # ORDER
    order_quantity=60
)

res_order = run_simulation(db=db, request=req_order)
print("\n--- Simulation Response (Scenario B: ORDER 60) ---")
print(f"Initial Inv: {res_order.initial_inventory} | Final Inv: {res_order.final_inventory} | Service Level: {res_order.service_level_percentage}% | Profit: ${res_order.total_profit}")

# 3. Verify Database Isolation (Zero DB mutations)
inv_after = db.query(InventoryRecord).filter(InventoryRecord.product_id == 1).all()
inv_after_state = [(r.id, r.quantity, r.location) for r in inv_after]
print("\nInventoryRecord after simulation:", inv_after_state)

assert inv_before_state == inv_after_state, "ERROR: Database InventoryRecord was mutated by simulation!"
print("-> DATABASE ISOLATION VERIFIED: Zero database mutations occurred during simulation!")

db.close()
print("ALL SIMULATION SERVICE TESTS PASSED!")
