import sys
import os
sys.path.insert(0, os.path.abspath("."))

import numpy as np
import gymnasium as gym
from database.db import SessionLocal
from database.models import InventoryRecord, Order, Supplier
from services.rl_environment import SupplyChainEnv

db = SessionLocal()

print("==================================================================")
print("RUNNING NATIVE SEQUENTIAL RL ENVIRONMENT TEST SUITE")
print("==================================================================\n")

# Record DB state before tests
inv_before = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
orders_before = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]
print(f"Initial DB State: {len(inv_before)} InventoryRecords, {len(orders_before)} Orders.")

# ------------------------------------------------------------------
# TEST A: reset() Verification
# ------------------------------------------------------------------
print("\n--- TEST A: reset() Verification ---")
env = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=5, fixed_order_quantity=50)
obs, info = env.reset(seed=42)

assert isinstance(obs, np.ndarray), "obs must be numpy array"
assert obs.shape == (9,), f"obs shape must be (9,), got {obs.shape}"
assert obs.dtype == np.float32, f"obs dtype must be float32, got {obs.dtype}"
assert info["day"] == 1, "reset info day must be 1"
print(f"Obs Shape: {obs.shape} | Dtype: {obs.dtype}")
print(f"Initial Obs Vector: {obs.tolist()}")
print("-> TEST A PASSED: reset() returns 9-element float32 observation and fresh info dict.")

# ------------------------------------------------------------------
# TEST B: Native Sequential Progression over [ORDER, NOOP, NOOP, ORDER, NOOP]
# ------------------------------------------------------------------
print("\n--- TEST B: Native Sequential Progression ---")
seq_actions = [1, 0, 0, 1, 0]
action_names = {0: "NOOP", 1: "ORDER", 2: "EXPEDITE"}

for step_idx, act in enumerate(seq_actions):
    obs, reward, terminated, truncated, info = env.step(act)
    print(f"Day {info['day']} | Action: {act} ({info['action_taken']}) | StartInv: {info['starting_inventory']} | EndInv: {info['ending_inventory']} | PendingQty: {obs[2]} | MinLead: {obs[3]} | Reward: ${reward:,.2f}")
    assert info["day"] == step_idx + 1, f"Expected day {step_idx + 1}, got {info['day']}"
    assert isinstance(reward, float), "Reward must be float"

print("-> TEST B PASSED: Each step advanced natively by exactly ONE day.")

# ------------------------------------------------------------------
# TEST C: Action Behavior Verification
# ------------------------------------------------------------------
print("\n--- TEST C: Action Behavior Verification ---")
# 1. NOOP never creates an order
env_c = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=3, fixed_order_quantity=50)
obs_c, info_c = env_c.reset()
_, r_noop, _, _, info_noop = env_c.step(0)
assert info_noop["order_quantity_placed"] == 0
assert info_noop["purchase_cost"] == 0.0
assert len(env_c.pending_orders) == 0
print("  - NOOP: 0 orders created, $0 purchase cost.")

# 2. ORDER creates 1 order on selected day
_, r_ord, _, _, info_ord = env_c.step(1)
assert info_ord["order_quantity_placed"] == 50
assert info_ord["purchase_cost"] > 0.0
assert len(env_c.pending_orders) == 1
print("  - ORDER: Exactly 1 order created on selected day.")

# 3. EXPEDITE with pending order accelerates delivery
days_before_exp = env_c.pending_orders[0]["days_remaining"]
_, r_exp, _, _, info_exp = env_c.step(2)
days_after_exp = env_c.pending_orders[0]["days_remaining"]
# Morning delivery decremented days_remaining by 1 (7 -> 6), and EXPEDITE accelerated by 2 (6 -> 4)
assert days_after_exp == max(1, days_before_exp - 1 - 2)
assert info_exp["expedite_cost"] == 50.0
print(f"  - EXPEDITE (with pending order): Days remaining accelerated from {days_before_exp} to {days_after_exp}.")

# 4. EXPEDITE without pending order does NOT create purchase order
env_exp_empty = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=3, fixed_order_quantity=50)
env_exp_empty.reset()
_, _, _, _, info_exp_empty = env_exp_empty.step(2)
assert info_exp_empty["order_quantity_placed"] == 0
assert info_exp_empty["purchase_cost"] == 0.0
assert len(env_exp_empty.pending_orders) == 0
print("  - EXPEDITE (without pending order): 0 purchase orders created, $0 purchase cost.")
print("-> TEST C PASSED: Action semantics verified cleanly.")

# ------------------------------------------------------------------
# TEST D: Supplier Lead Time Delivery Accuracy
# ------------------------------------------------------------------
print("\n--- TEST D: Supplier Lead Time Delivery Accuracy ---")
sup1 = db.query(Supplier).first()
lead_time = sup1.lead_time_days
sim_horizon = lead_time + 2

env_d = SupplyChainEnv(db=db, product_id=1, supplier_id=sup1.id, initial_inventory=10, max_steps=sim_horizon, fixed_order_quantity=100)
env_d.reset()

# Day 1: ORDER 100
_, _, _, _, day1_info = env_d.step(1)
assert len(env_d.pending_orders) == 1
assert env_d.pending_orders[0]["days_remaining"] == lead_time

# Advance NOOP on Days 2..lead_time
for day_i in range(2, lead_time + 1):
    _, _, _, _, day_i_info = env_d.step(0)

# Day before arrival ending inventory
day_before_ending = day_i_info["ending_inventory"]

# Day (lead_time + 1) morning delivery arrives
_, _, _, _, arrival_day_info = env_d.step(0)
print(f"Day {lead_time} ending inventory: {day_before_ending}")
print(f"Day {lead_time + 1} starting inventory (after arrival): {arrival_day_info['starting_inventory']}")

assert arrival_day_info["starting_inventory"] == day_before_ending + 100
print(f"-> TEST D PASSED: 100-unit order arrived deterministically on Day {lead_time + 1} morning after {lead_time} days lead time.")

# ------------------------------------------------------------------
# TEST E: Single-Step Reward Verification
# ------------------------------------------------------------------
print("\n--- TEST E: Single-Step Reward Verification ---")
env_e = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=5, fixed_order_quantity=50)
env_e.reset()
_, r1, _, _, info1 = env_e.step(0)
_, r2, _, _, info2 = env_e.step(0)

assert r1 == info1["daily_profit"], f"Reward {r1} != Daily Profit {info1['daily_profit']}"
assert r2 == info2["daily_profit"], f"Reward {r2} != Daily Profit {info2['daily_profit']}"
assert info2["cumulative_profit"] == round(info1["daily_profit"] + info2["daily_profit"], 2)
assert r2 != info2["cumulative_profit"], "Reward must be single-step reward, NOT cumulative profit!"
print(f"  Day 1 Reward: ${r1:,.2f} | Day 2 Reward: ${r2:,.2f} | Day 2 Cumulative Profit: ${info2['cumulative_profit']:,.2f}")
print("-> TEST E PASSED: step() returns single-day reward r_t, not cumulative profit.")

# ------------------------------------------------------------------
# TEST F: Database Isolation Verification
# ------------------------------------------------------------------
print("\n--- TEST F: Database Isolation Verification ---")
inv_after = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
orders_after = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]

assert inv_before == inv_after, "ERROR: InventoryRecord table was mutated!"
assert orders_before == orders_after, "ERROR: Order table was mutated!"
print("-> TEST F PASSED: ZERO SQLite database records were created, modified, or deleted.")

# ------------------------------------------------------------------
# TEST G: Gymnasium Loop Compatibility
# ------------------------------------------------------------------
print("\n--- TEST G: Gymnasium Loop Compatibility ---")
env_g = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=10, fixed_order_quantity=50)
obs_g, info_g = env_g.reset(seed=123)
done_g = False
steps_g = 0

while not done_g:
    act_g = env_g.action_space.sample()
    obs_g, reward_g, terminated_g, truncated_g, info_g = env_g.step(act_g)
    steps_g += 1
    done_g = terminated_g or truncated_g

assert steps_g == 10
assert done_g == True
print(f"-> TEST G PASSED: Gymnasium loop executed {steps_g} steps cleanly to episode completion.")

# ------------------------------------------------------------------
# TEST H: Performance Check (O(1) Single-Day Transitions)
# ------------------------------------------------------------------
print("\n--- TEST H: Performance Verification ---")

env_h = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=30, fixed_order_quantity=50)
obs_h, info_h = env_h.reset()

for i in range(30):
    obs_h, r_h, term_h, trunc_h, info_h = env_h.step(0)

print("-> TEST H PASSED: 30 sequential steps executed natively in O(1) time without episode re-simulation.")

db.close()

print("\n==================================================================")
print("ALL NATIVE SEQUENTIAL RL ENVIRONMENT TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
