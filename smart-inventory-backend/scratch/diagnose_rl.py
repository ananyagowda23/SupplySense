import sys
import os
sys.path.insert(0, os.path.abspath("."))

from collections import Counter
import numpy as np
from stable_baselines3 import PPO
from database.db import SessionLocal
from services.rl_environment import SupplyChainEnv
from schemas.simulation import SimulationRequest, DailyAction
from services.simulation_service import run_simulation

db = SessionLocal()

print("==================================================================")
print("DIAGNOSTIC INVESTIGATION OF RL ENVIRONMENT & PPO POLICY")
print("==================================================================\n")

# ------------------------------------------------------------------
# DIAGNOSTIC 1: PPO Action Distribution during Evaluation
# ------------------------------------------------------------------
print("--- DIAGNOSTIC 1: PPO Action Distribution during Evaluation ---")
model_path = os.path.join("training", "saved_models", "ppo_supply_chain.zip")
if os.path.exists(model_path):
    model = PPO.load(model_path)
    env = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=30, fixed_order_quantity=50)
    obs, info = env.reset(seed=42)
    actions_taken = []
    done = False
    while not done:
        action, _ = model.predict(obs, deterministic=True)
        action = int(action)
        actions_taken.append(action)
        obs, reward, terminated, truncated, info = env.step(action)
        done = terminated or truncated

    counts = Counter(actions_taken)
    print(f"Total steps in episode: {len(actions_taken)}")
    print(f"Action Counts taken by PPO: {dict(counts)}")
    print(f"  NOOP (0):     {counts[0]}")
    print(f"  ORDER (1):    {counts[1]}")
    print(f"  EXPEDITE (2): {counts[2]}")

    action_names = {0: "NOOP", 1: "ORDER", 2: "EXPEDITE"}
    print(f"Sequence of actions taken: {[action_names[a] for a in actions_taken]}")

# ------------------------------------------------------------------
# DIAGNOSTIC 2: Observation Progression for [ORDER, NOOP, NOOP, ORDER, NOOP]
# ------------------------------------------------------------------
print("\n--- DIAGNOSTIC 2: Observation Progression for [ORDER, NOOP, NOOP, ORDER, NOOP] ---")
env = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=5, fixed_order_quantity=50)
obs, info = env.reset(seed=42)
print(f"Day 1 Initial Obs (StartInv, Demand, PendingQty, MinLead, Rel, Lead, AvgFcst, Safety, Reorder):")
print(f"  {obs.tolist()}")

test_sequence = [1, 0, 0, 1, 0]
for idx, act in enumerate(test_sequence):
    obs, reward, terminated, truncated, info = env.step(act)
    print(f"\nStep {idx+1} (Day {info['day']}) | Action: {act} ({info['action_taken']})")
    print(f"  Obs Vector: {obs.tolist()}")
    print(f"  Single Day Reward: {reward} | Ending Inv: {info['ending_inventory']} | Pending Orders Count: {info['pending_orders_count']}")

# ------------------------------------------------------------------
# DIAGNOSTIC 3: Action Differentiation (All-NOOP vs All-ORDER vs All-EXPEDITE)
# ------------------------------------------------------------------
print("\n--- DIAGNOSTIC 3: Action Differentiation Across Baseline Policies ---")
def run_baseline(action_val, max_steps=30):
    env = SupplyChainEnv(db=db, product_id=1, initial_inventory=50, max_steps=max_steps, fixed_order_quantity=50)
    obs, info = env.reset(seed=42)
    done = False
    ep_reward = 0.0
    daily_rewards = []
    actions_placed = []
    while not done:
        obs, reward, terminated, truncated, info = env.step(action_val)
        ep_reward += reward
        daily_rewards.append(reward)
        actions_placed.append(info['action_taken'])
        done = terminated or truncated
    return {
        "ep_reward": ep_reward,
        "daily_rewards_sample": daily_rewards[:5],
        "profit": info['cumulative_profit'],
        "service_level": info['service_level'],
        "final_inv": info['ending_inventory']
    }

noop_res = run_baseline(0)
order_res = run_baseline(1)
expedite_res = run_baseline(2)

print(f"All NOOP:     Total Reward = {noop_res['ep_reward']:,.2f} | Profit = ${noop_res['profit']:,.2f} | Service Level = {noop_res['service_level']}% | First 3 Daily Rewards = {noop_res['daily_rewards_sample'][:3]}")
print(f"All ORDER:    Total Reward = {order_res['ep_reward']:,.2f} | Profit = ${order_res['profit']:,.2f} | Service Level = {order_res['service_level']}% | First 3 Daily Rewards = {order_res['daily_rewards_sample'][:3]}")
print(f"All EXPEDITE: Total Reward = {expedite_res['ep_reward']:,.2f} | Profit = ${expedite_res['profit']:,.2f} | Service Level = {expedite_res['service_level']}% | First 3 Daily Rewards = {expedite_res['daily_rewards_sample'][:3]}")

# ------------------------------------------------------------------
# DIAGNOSTIC 4: Semantics of Action 2 (EXPEDITE) on Day 1
# ------------------------------------------------------------------
print("\n--- DIAGNOSTIC 4: EXPEDITE Behavior on Day 1 vs Subsequent Days ---")
# Check what EXPEDITE does on Day 1 when pending_orders is empty
req_exp1 = SimulationRequest(
    product_id=1,
    initial_inventory=50,
    simulation_days=1,
    actions=[DailyAction(action=2, order_quantity=50)] # EXPEDITE on Day 1
)
res_exp1 = run_simulation(db=db, request=req_exp1)
day1_exp = res_exp1.daily_results[0]
print(f"Day 1 EXPEDITE (no pending orders):")
print(f"  Action Taken: {day1_exp.action_taken} | Order Qty Placed: {day1_exp.order_quantity_placed} | Purchase Cost: ${day1_exp.purchase_cost} | Expedite Fee: ${day1_exp.expedite_cost}")

# Check what EXPEDITE does on Day 2 when pending_orders is NOT empty
req_exp2 = SimulationRequest(
    product_id=1,
    initial_inventory=50,
    simulation_days=2,
    actions=[DailyAction(action=2, order_quantity=50), DailyAction(action=2, order_quantity=50)] # EXPEDITE on Day 1 and Day 2
)
res_exp2 = run_simulation(db=db, request=req_exp2)
day2_exp = res_exp2.daily_results[1]
print(f"\nDay 2 EXPEDITE (pending order exists from Day 1):")
print(f"  Action Taken: {day2_exp.action_taken} | Order Qty Placed: {day2_exp.order_quantity_placed} | Purchase Cost: ${day2_exp.purchase_cost} | Expedite Fee: ${day2_exp.expedite_cost}")

db.close()
