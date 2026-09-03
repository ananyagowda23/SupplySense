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
print("DIAGNOSTIC INVESTIGATION OF CQL CONVERGENCE TO NOOP")
print("==================================================================\n")

# 1. Load Trained CQL Model
cql_path = os.path.join("training", "saved_models", "cql_supply_chain.pt")
assert os.path.exists(cql_path), f"File not found: {cql_path}"
agent = CQLAgent(state_dim=9, action_dim=3, hidden_dim=128)
agent.load_model(cql_path)

# 2. Inspect Q-Values Across Sample Evaluation States
env = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=5, fixed_order_quantity=50)
obs, info = env.reset(seed=42)

print("--- DIAGNOSTIC 1: Predicted Q-Values Q(s, a) for Evaluation States ---")
for step_i in range(5):
    with torch.no_grad():
        s_tensor = torch.FloatTensor(obs).unsqueeze(0)
        q_vals = agent.q_net(s_tensor).numpy()[0]
        selected_act = int(np.argmax(q_vals))

    print(f"Step {step_i+1} (Day {info['day']}) | StartInv: {obs[0]:.1f} | ReorderPoint: {obs[8]:.1f}")
    print(f"  Q(s, NOOP=0):     {q_vals[0]:14.2f}")
    print(f"  Q(s, ORDER=1):    {q_vals[1]:14.2f}")
    print(f"  Q(s, EXPEDITE=2): {q_vals[2]:14.2f}")
    print(f"  Selected Action: {selected_act} ({['NOOP', 'ORDER', 'EXPEDITE'][selected_act]})")
    print(f"  Q-Diff (Q_ORDER - Q_NOOP): {q_vals[1] - q_vals[0]:14.2f}\n")

    obs, reward, terminated, truncated, info = env.step(selected_act)

# 3. Inspect Offline Dataset Reward Scale and State Ranges
data = np.load(os.path.join("training", "datasets", "offline_cql_dataset.npz"))
states = data["states"]
rewards = data["rewards"]
actions = data["actions"]

print("--- DIAGNOSTIC 2: Offline Dataset Reward Scale & State Feature Ranges ---")
print(f"Rewards Range: Min = ${np.min(rewards):,.2f} | Max = ${np.max(rewards):,.2f} | Mean = ${np.mean(rewards):,.2f} | Std = ${np.std(rewards):,.2f}")
print("State Feature Ranges (Min ... Max):")
feature_names = [
    "1. StartInv", "2. DailyDemand", "3. PendingQty", "4. MinDaysLead",
    "5. Reliability", "6. LeadTimeDays", "7. AvgForecast", "8. SafetyStock", "9. ReorderPoint"
]
for col_i in range(9):
    c_min = np.min(states[:, col_i])
    c_max = np.max(states[:, col_i])
    c_mean = np.mean(states[:, col_i])
    c_std = np.std(states[:, col_i])
    print(f"  {feature_names[col_i]:16s}: [{c_min:8.2f} ... {c_max:8.2f}] | Mean={c_mean:7.2f}, Std={c_std:7.2f}")

# 4. Inspect Batch Loss Magnitudes During Training Step
print("\n--- DIAGNOSTIC 3: Loss Magnitudes (Bellman MSE vs. CQL Conservative Penalty) ---")
b_states = torch.FloatTensor(states[:256])
b_actions = torch.LongTensor(actions[:256])
b_rewards = torch.FloatTensor(rewards[:256])
b_next_states = torch.FloatTensor(data["next_states"][:256])
b_dones = torch.FloatTensor(data["dones"][:256])

# Unscaled gradient step
metrics_raw = agent.update(b_states, b_actions, b_rewards, b_next_states, b_dones)
print("RAW UNSCALED UPDATES:")
print(f"  Bellman MSE Loss:      {metrics_raw['bellman_loss']:18.2f}")
print(f"  CQL LogSumExp Penalty: {metrics_raw['cql_loss']:18.2f}")
print(f"  Total Loss:            {metrics_raw['total_loss']:18.2f}")

# Scaled reward gradient step simulation (rewards / 1000)
b_rewards_scaled = b_rewards / 1000.0
agent_scaled = CQLAgent(state_dim=9, action_dim=3, hidden_dim=128, cql_weight=1.0)
metrics_scaled = agent_scaled.update(b_states, b_actions, b_rewards_scaled, b_next_states, b_dones)
print("\nSCALED REWARDS (/1000) UPDATES:")
print(f"  Bellman MSE Loss:      {metrics_scaled['bellman_loss']:18.2f}")
print(f"  CQL LogSumExp Penalty: {metrics_scaled['cql_loss']:18.2f}")
print(f"  Total Loss:            {metrics_scaled['total_loss']:18.2f}")

# 5. Inspect Q-Values of dataset actions vs non-dataset actions
print("\n--- DIAGNOSTIC 4: Dataset Action Q-values vs. OOD Action Q-values ---")
with torch.no_grad():
    q_all_sample = agent.q_net(b_states).numpy()
    noop_q_mean = np.mean(q_all_sample[:, 0])
    order_q_mean = np.mean(q_all_sample[:, 1])
    exp_q_mean = np.mean(q_all_sample[:, 2])

print(f"Mean Predicted Q-Values across 256 states:")
print(f"  Mean Q(s, NOOP=0):     {noop_q_mean:14.2f}")
print(f"  Mean Q(s, ORDER=1):    {order_q_mean:14.2f}")
print(f"  Mean Q(s, EXPEDITE=2): {exp_q_mean:14.2f}")

db.close()
