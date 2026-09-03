import sys
import os
import torch
import numpy as np

sys.path.insert(0, os.path.abspath("."))

from database.db import SessionLocal
from database.models import Product, Supplier, InventoryRecord
from services.rl_environment import SupplyChainEnv
from training.cql_model import CQLAgent

db = SessionLocal()

print("==================================================================")
print("EVALUATING SAVED CQL MODEL ACROSS ALL 20 PRODUCTS")
print("==================================================================\n")

cql_path = os.path.join("training", "saved_models", "cql_supply_chain.pt")
agent = CQLAgent(state_dim=9, action_dim=3, hidden_dim=128)
agent.load_model(cql_path)

print(f"{'ProdID':6s} | {'LeadTime':8s} | {'Rel':5s} | {'Day1 Q(NOOP)':12s} | {'Day1 Q(ORDER)':13s} | {'Day1 Q(EXP)':11s} | {'Day1 Action':11s} | {'30-Day Policy Actions':25s}")
print("-" * 105)

for p_id in range(1, 21):
    env = SupplyChainEnv(db=db, product_id=p_id, initial_inventory=50, max_steps=30, fixed_order_quantity=50)
    obs, info = env.reset(seed=42)
    
    # Day 1 Q-values
    agent.q_net.eval()
    with torch.no_grad():
        obs_norm = (obs - agent.state_mean) / agent.state_std
        obs_t = torch.FloatTensor(obs_norm).unsqueeze(0)
        q_vals = agent.q_net(obs_t).numpy()[0]
        d1_act = int(np.argmax(q_vals))

    act_counts = {0: 0, 1: 0, 2: 0}
    done = False
    while not done:
        act = agent.select_action(obs, deterministic=True)
        act_counts[act] += 1
        obs, reward, terminated, truncated, step_info = env.step(act)
        done = terminated or truncated

    act_str = f"NOOP:{act_counts[0]} ORD:{act_counts[1]} EXP:{act_counts[2]}"
    print(f"{p_id:6d} | {obs[5]:8.1f} | {obs[4]:5.2f} | {q_vals[0]:12.4f} | {q_vals[1]:13.4f} | {q_vals[2]:11.4f} | {['NOOP', 'ORDER', 'EXPEDITE'][d1_act]:11s} | {act_str:25s}")

db.close()
