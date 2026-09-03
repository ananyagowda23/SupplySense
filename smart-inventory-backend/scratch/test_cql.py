import sys
import os
import math
import numpy as np
import torch

sys.path.insert(0, os.path.abspath("."))

from database.db import SessionLocal
from database.models import InventoryRecord, Order
from services.rl_environment import SupplyChainEnv
from training.cql_model import DiscreteQNetwork, CQLAgent

db = SessionLocal()

print("==================================================================")
print("RUNNING FIXED CQL OFFLINE RL UNIT TEST SUITE")
print("==================================================================\n")

# Record initial database snapshot to verify 0 DB mutations
inv_before = [(r.id, r.quantity) for r in db.query(InventoryRecord).all()]
orders_before = [(o.id, o.status) for o in db.query(Order).all()]
print(f"Initial DB State: {len(inv_before)} InventoryRecords, {len(orders_before)} Orders.")

# ------------------------------------------------------------------
# TEST 1: Dataset Loading Verification
# ------------------------------------------------------------------
print("\n--- TEST 1: Dataset Loading Verification ---")
dataset_path = os.path.join("training", "datasets", "offline_cql_dataset.npz")
assert os.path.exists(dataset_path), f"ERROR: Offline dataset not found at '{dataset_path}'!"
data = np.load(dataset_path)
assert "states" in data and "actions" in data and "rewards" in data and "next_states" in data and "dones" in data
print(f"[OK] Offline dataset loaded cleanly: {len(data['states']):,} transitions.")

# ------------------------------------------------------------------
# TEST 2: State Normalization Computation
# ------------------------------------------------------------------
print("\n--- TEST 2: State Feature Normalization ---")
raw_states = data["states"]
state_mean = np.mean(raw_states, axis=0, dtype=np.float32)
state_std = np.std(raw_states, axis=0, dtype=np.float32)
state_std = np.where(state_std < 1e-6, 1.0, state_std)

agent = CQLAgent(state_dim=9, action_dim=3, hidden_dim=128, cql_weight=1.0, state_mean=state_mean, state_std=state_std)
assert agent.state_mean is not None and agent.state_std is not None
assert agent.state_mean.shape == (9,) and agent.state_std.shape == (9,)
print(f"[OK] State feature standardization parameters computed and attached to agent.")

# ------------------------------------------------------------------
# TEST 3: Gradient Step with Scaled Rewards & Gradient Norm Tracking
# ------------------------------------------------------------------
print("\n--- TEST 3: Gradient Step with Scaled Rewards & Gradient Norm Tracking ---")
states_norm = torch.FloatTensor((raw_states[:32] - state_mean) / state_std)
actions_t = torch.LongTensor(data["actions"][:32])
rewards_scaled = torch.FloatTensor(data["rewards"][:32] / 1000.0)
next_states_norm = torch.FloatTensor((data["next_states"][:32] - state_mean) / state_std)
dones_t = torch.FloatTensor(data["dones"][:32])

metrics = agent.update(states_norm, actions_t, rewards_scaled, next_states_norm, dones_t)
assert math.isfinite(metrics["total_loss"]), "Loss is not finite!"
assert math.isfinite(metrics["bellman_loss"]), "Bellman loss is not finite!"
assert math.isfinite(metrics["cql_loss"]), "CQL loss is not finite!"
assert math.isfinite(metrics["grad_norm_before"]), "Grad norm before is not finite!"
assert math.isfinite(metrics["grad_norm_after"]), "Grad norm after is not finite!"

print(f"[OK] Training step completed cleanly:")
print(f"     Bellman Loss: {metrics['bellman_loss']:.4f} | CQL Penalty: {metrics['cql_loss']:.4f}")
print(f"     Grad Norm Before: {metrics['grad_norm_before']:.4f} | Grad Norm After: {metrics['grad_norm_after']:.4f}")
print(f"     Mean Q(NOOP): {metrics['mean_q_noop']:.4f} | Mean Q(ORDER): {metrics['mean_q_order']:.4f} | Mean Q(EXP): {metrics['mean_q_expedite']:.4f}")

# ------------------------------------------------------------------
# TEST 4: Model Save & Load Verification with Normalization Params
# ------------------------------------------------------------------
print("\n--- TEST 4: Model Save & Load Persistence ---")
test_save_path = os.path.join("training", "saved_models", "test_cql_fixed.pt")
agent.save_model(test_save_path)
assert os.path.exists(test_save_path), "Saved model file not found!"

loaded_agent = CQLAgent(state_dim=9, action_dim=3, hidden_dim=128)
loaded_agent.load_model(test_save_path)
assert loaded_agent.state_mean is not None and loaded_agent.state_std is not None
assert np.allclose(loaded_agent.state_mean, state_mean)
assert np.allclose(loaded_agent.state_std, state_std)

test_obs = np.array([50.0, 30.0, 0.0, 0.0, 0.95, 5.0, 32.0, 10.0, 20.0], dtype=np.float32)
orig_act = agent.select_action(test_obs)
load_act = loaded_agent.select_action(test_obs)
assert orig_act == load_act, f"Inference mismatch! Original: {orig_act}, Loaded: {load_act}"

# Clean up test save file
if os.path.exists(test_save_path):
    os.remove(test_save_path)
print(f"[OK] Model weights & normalization parameters saved, loaded back, and inference action ({load_act}) matched perfectly.")

# ------------------------------------------------------------------
# TEST 5: SupplyChainEnv Inference Verification
# ------------------------------------------------------------------
print("\n--- TEST 5: SupplyChainEnv Inference ---")
env = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=5, fixed_order_quantity=50)
obs, info = env.reset(seed=100)
actions_produced = []

for _ in range(5):
    act = loaded_agent.select_action(obs)
    assert act in [0, 1, 2], f"Invalid action produced: {act}"
    actions_produced.append(act)
    obs, reward, terminated, truncated, step_info = env.step(act)

print(f"[OK] Environment inference produced valid actions: {actions_produced}")

# ------------------------------------------------------------------
# TEST 6: Database Isolation Verification
# ------------------------------------------------------------------
print("\n--- TEST 6: Database Isolation Verification ---")
inv_after = [(r.id, r.quantity) for r in db.query(InventoryRecord).all()]
orders_after = [(o.id, o.status) for o in db.query(Order).all()]
db.close()

assert inv_before == inv_after, "ERROR: InventoryRecord table was mutated!"
assert orders_before == orders_after, "ERROR: Order table was mutated!"
print("[OK] ZERO SQLite database records were created, modified, or deleted.")

print("\n==================================================================")
print("ALL FIXED CQL OFFLINE RL UNIT TESTS PASSED SUCCESSFULLY!")
print("==================================================================")
