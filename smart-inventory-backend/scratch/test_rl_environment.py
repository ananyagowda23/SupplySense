import sys
import os
sys.path.insert(0, os.path.abspath("."))

import numpy as np
import gymnasium as gym
from database.db import SessionLocal
from database.models import InventoryRecord, Order
from services.rl_environment import SupplyChainEnv

db = SessionLocal()

print("==================================================================")
print("RUNNING GYMNASIUM RL ENVIRONMENT TEST SUITE")
print("==================================================================\n")

# Record Database State Before Tests
inv_before = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
orders_before = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]
print(f"Initial DB State: {len(inv_before)} InventoryRecords, {len(orders_before)} Orders.")

# 1. Instantiate Environment
env = SupplyChainEnv(
    db=db,
    product_id=1,
    initial_inventory=50,
    max_steps=5,
    fixed_order_quantity=40,
)

print(f"\nEnvironment Initialized:")
print(f"  Observation Space: {env.observation_space}")
print(f"  Action Space: {env.action_space}")

assert env.observation_space.shape == (9,)
assert env.observation_space.dtype == np.float32
assert env.action_space.n == 3
print("-> Space definitions verified successfully!")

# 2. Test reset()
obs, info = env.reset()
print(f"\nReset Output:")
print(f"  Obs shape: {obs.shape}, dtype: {obs.dtype}")
print(f"  Initial Obs Vector: {obs}")
print(f"  Reset Info: {info}")

assert isinstance(obs, np.ndarray)
assert obs.shape == (9,)
assert obs.dtype == np.float32
assert info["day"] == 1
print("-> reset() verified successfully!")

# 3. Step through an entire episode with manual actions
# Day 1: ORDER (1)
# Day 2: NOOP (0)
# Day 3: EXPEDITE (2)
# Day 4: NOOP (0)
# Day 5: NOOP (0)
manual_actions = [1, 0, 2, 0, 0]

print("\n--- Stepping Through Episode ---")
step_count = 0
for action in manual_actions:
    obs, reward, terminated, truncated, info = env.step(action)
    step_count += 1
    print(f"\nDay {info['day']} | Action Selected: {action} ({info['action_taken']})")
    print(f"  Obs Vector: {obs}")
    print(f"  Reward: {reward} (Type: {type(reward).__name__})")
    print(f"  Terminated: {terminated}, Truncated: {truncated}")
    print(f"  Info: Day={info['day']}, StartInv={info['starting_inventory']}, Demand={info['daily_demand']}, Fulfilled={info['fulfilled_demand']}, EndInv={info['ending_inventory']}, Profit=${info['daily_profit']}")

    assert isinstance(obs, np.ndarray)
    assert obs.shape == (9,)
    assert obs.dtype == np.float32
    assert isinstance(reward, float)
    assert isinstance(terminated, bool)
    assert isinstance(truncated, bool)

assert step_count == 5
assert terminated == True
print("\n-> Entire episode executed to completion (terminated == True)!")

# 4. Test Invalid Action Rejection
print("\n--- Testing Invalid Action Rejection ---")
try:
    env.step(99)
    assert False, "Expected ValueError for invalid action 99"
except ValueError as exc:
    print(f"-> Invalid action correctly rejected with ValueError: {exc}")

# 5. Test Database Isolation (Zero Database Mutations)
print("\n--- Testing Database Isolation ---")
inv_after = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
orders_after = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]

assert inv_before == inv_after, "ERROR: InventoryRecord table was mutated during RL environment execution!"
assert orders_before == orders_after, "ERROR: Order table was mutated during RL environment execution!"

print(f"Final DB State: {len(inv_after)} InventoryRecords, {len(orders_after)} Orders.")
print("-> DATABASE ISOLATION VERIFIED: ZERO database records were created, modified, or deleted!")

db.close()

print("\n==================================================================")
print("ALL GYMNASIUM RL ENVIRONMENT TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
