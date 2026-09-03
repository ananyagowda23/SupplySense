import sys
import os
sys.path.insert(0, os.path.abspath("."))

import random
import numpy as np
from database.db import SessionLocal
from database.models import InventoryRecord, Order
from services.rl_environment import SupplyChainEnv

db = SessionLocal()

print("==================================================================")
print("RUNNING RL TRAINING & MODEL PERSISTENCE VERIFICATION TEST SUITE")
print("==================================================================\n")

# Record DB state before tests
inv_before = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
orders_before = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]
print(f"Initial DB State: {len(inv_before)} InventoryRecords, {len(orders_before)} Orders.")

# 1. Environment Creation & SB3 Wrapping Check
print("\n1. Testing Environment Creation and SB3 Wrapper Compatibility...")
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv

def make_env():
    return SupplyChainEnv(
        db=db,
        product_id=1,
        initial_inventory=50,
        max_steps=10,
        fixed_order_quantity=50,
    )

vec_env = DummyVecEnv([make_env])
print("-> Environment created and wrapped in DummyVecEnv successfully!")

# 2. PPO Training for Small Timesteps (1,000 timesteps)
print("\n2. Testing PPO Model Training (1,000 timesteps)...")
model = PPO("MlpPolicy", vec_env, verbose=0, seed=42)
model.learn(total_timesteps=1000)
print("-> PPO training for 1,000 timesteps completed without errors!")

# 3. Model Saving
print("\n3. Testing Local Model Saving...")
test_save_path = os.path.join(os.path.dirname(__file__), "ppo_test_model.zip")
model.save(test_save_path)
assert os.path.exists(test_save_path), f"Save file {test_save_path} not found!"
print(f"-> Model saved successfully to '{test_save_path}'!")

# 4. Model Loading & Prediction
print("\n4. Testing Local Model Loading and Action Prediction...")
loaded_model = PPO.load(test_save_path)
print("-> Model loaded successfully!")

env = make_env()
obs, info = env.reset(seed=42)

action, _states = loaded_model.predict(obs, deterministic=True)
action = int(action)
print(f"-> Action predicted by loaded model for initial obs: {action} (Type: {type(action).__name__})")
assert action in (0, 1, 2), f"Predicted action {action} not in valid action space!"

# 5. Complete Episode Evaluation
print("\n5. Running Complete Episode Evaluation with Loaded Model...")
ep_reward = 0.0
done = False
steps = 0

while not done:
    action, _ = loaded_model.predict(obs, deterministic=True)
    obs, reward, terminated, truncated, info = env.step(int(action))
    ep_reward += reward
    steps += 1
    done = terminated or truncated

print(f"-> Episode evaluated cleanly over {steps} steps with cumulative reward: ${ep_reward:,.2f}")
assert steps == 10
assert done == True

# Cleanup test model file
if os.path.exists(test_save_path):
    os.remove(test_save_path)

# 6. Database Isolation Check
print("\n6. Testing Database Isolation (Zero SQLite Mutations)...")
inv_after = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
orders_after = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]

assert inv_before == inv_after, "ERROR: InventoryRecord table was modified!"
assert orders_before == orders_after, "ERROR: Order table was modified!"
print("-> DATABASE ISOLATION VERIFIED: ZERO database records were created, modified, or deleted!")

db.close()

print("\n==================================================================")
print("ALL RL TRAINING VERIFICATION TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
