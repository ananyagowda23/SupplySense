import sys
import os
import torch
import numpy as np

sys.path.insert(0, os.path.abspath("."))

from database.db import SessionLocal
from services.rl_environment import SupplyChainEnv
from training.cql_model import CQLAgent

db = SessionLocal()

print("==================================================================")
print("CQL INFERENCE-PATH DIAGNOSTIC INVESTIGATION")
print("==================================================================\n")

# ------------------------------------------------------------------
# CHECK 3 & 4: Checkpoint Verification & Saved Model Inspection
# ------------------------------------------------------------------
cql_path = os.path.join("training", "saved_models", "cql_supply_chain.pt")
print(f"--- CHECK 3 & 4: Model Checkpoint Path: '{os.path.abspath(cql_path)}' ---")
assert os.path.exists(cql_path), f"Checkpoint missing: {cql_path}"

checkpoint = torch.load(cql_path, weights_only=False)
print("Checkpoint Keys:", list(checkpoint.keys()))
print("Checkpoint Saved state_mean:", checkpoint.get("state_mean"))
print("Checkpoint Saved state_std:", checkpoint.get("state_std"))

# Load agent from checkpoint
agent = CQLAgent(state_dim=9, action_dim=3, hidden_dim=128)
agent.load_model(cql_path)

# Verify agent's internal normalization matches checkpoint
assert np.allclose(agent.state_mean, checkpoint["state_mean"]), "Mean mismatch!"
assert np.allclose(agent.state_std, checkpoint["state_std"]), "Std mismatch!"
print("[OK] Checkpoint loaded into CQLAgent cleanly. Normalization statistics verified.\n")

# ------------------------------------------------------------------
# CHECK 7: Feature Ordering Verification
# ------------------------------------------------------------------
dataset_path = os.path.join("training", "datasets", "offline_cql_dataset.npz")
data = np.load(dataset_path)
dataset_states = data["states"]

print("--- CHECK 7: Feature Ordering Comparison (Env vs Dataset) ---")
feature_names = [
    "0. StartInv", "1. DailyDemand", "2. PendingQty", "3. MinDaysLead",
    "4. Reliability", "5. LeadTimeDays", "6. AvgForecast", "7. SafetyStock", "8. ReorderPoint"
]

env_test = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=1, fixed_order_quantity=50)
env_obs, _ = env_test.reset(seed=42)

print(f"{'Feature Index & Name':20s} | {'Env Initial Obs':15s} | {'Dataset Mean':14s} | {'Dataset Std':14s}")
print("-" * 72)
for i in range(9):
    print(f"{feature_names[i]:20s} | {env_obs[i]:15.2f} | {agent.state_mean[i]:14.2f} | {agent.state_std[i]:14.2f}")
print()

# ------------------------------------------------------------------
# CHECK 1, 2, 5, 6 & 8: Step-by-Step Evaluation Trace across 10 States
# ------------------------------------------------------------------
print("--- CHECK 1, 5 & 6: Step-by-Step Evaluation Trace across 10 States ---")
eval_env = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=10, fixed_order_quantity=50)
obs, info = eval_env.reset(seed=42)

print(f"{'Step':4s} | {'Day':3s} | {'StartInv':8s} | {'Q(NOOP=0)':12s} | {'Q(ORDER=1)':12s} | {'Q(EXP=2)':12s} | {'Argmax':7s} | {'SelectAct':9s}")
print("-" * 80)

for step_i in range(10):
    # Manual Trace:
    # 1. Raw state
    raw_obs = obs.copy()
    
    # 2. Manual Normalization
    obs_norm = (raw_obs - agent.state_mean) / agent.state_std
    
    # 3. Network Q-values
    agent.q_net.eval()
    with torch.no_grad():
        obs_tensor = torch.FloatTensor(obs_norm).unsqueeze(0)
        q_vals = agent.q_net(obs_tensor).numpy()[0]
        q_noop, q_order, q_exp = q_vals[0], q_vals[1], q_vals[2]
        manual_argmax = int(np.argmax(q_vals))

    # 4. Action via select_action()
    selected_act = agent.select_action(raw_obs, deterministic=True)
    assert manual_argmax == selected_act, f"Mismatch on step {step_i+1}! Manual: {manual_argmax}, SelectAction: {selected_act}"

    print(f"{step_i+1:4d} | {info['day']:3d} | {raw_obs[0]:8.1f} | {q_noop:12.4f} | {q_order:12.4f} | {q_exp:12.4f} | {manual_argmax:7d} | {selected_act:9d}")

    # 5. Environment step
    obs, reward, terminated, truncated, info = eval_env.step(selected_act)

# ------------------------------------------------------------------
# CHECK 9: Re-run Alpha Experiments Explicitly and Check Model Persistence
# ------------------------------------------------------------------
print("\n--- CHECK 9: Evaluating Q-values across dataset for current saved model ---")
with torch.no_grad():
    dataset_states_norm = torch.FloatTensor((dataset_states[:1000] - agent.state_mean) / agent.state_std)
    dataset_q_all = agent.q_net(dataset_states_norm).numpy()
    mean_q0 = np.mean(dataset_q_all[:, 0])
    mean_q1 = np.mean(dataset_q_all[:, 1])
    mean_q2 = np.mean(dataset_q_all[:, 2])

print(f"Across 1,000 Dataset States (Saved Model Checkpoint):")
print(f"  Mean Q(NOOP=0):     {mean_q0:10.4f}")
print(f"  Mean Q(ORDER=1):    {mean_q1:10.4f}")
print(f"  Mean Q(EXPEDITE=2): {mean_q2:10.4f}")

db.close()
