import sys
import os
import numpy as np

sys.path.insert(0, os.path.abspath("."))

from database.db import SessionLocal
from database.models import InventoryRecord, Order
from services.rl_environment import SupplyChainEnv
from training.cql_model import CQLAgent
from training.train_cql import evaluate_policy_across_all_products, print_cql_per_product_breakdown

db = SessionLocal()

print("==================================================================")
print("RUNNING MULTI-PRODUCT EVALUATION BENCHMARK UNIT TEST")
print("==================================================================\n")

# Record initial DB state to verify 0 mutations
inv_before = [(r.id, r.quantity) for r in db.query(InventoryRecord).all()]
orders_before = [(o.id, o.status) for o in db.query(Order).all()]
print(f"Initial DB State: {len(inv_before)} InventoryRecords, {len(orders_before)} Orders.")

cql_path = os.path.join("training", "saved_models", "cql_supply_chain.pt")
assert os.path.exists(cql_path), f"CQL model checkpoint missing: {cql_path}"

agent = CQLAgent(state_dim=9, action_dim=3, hidden_dim=128)
agent.load_model(cql_path)

print("Step 1: Running multi-product evaluation for CQL Agent across products 1..20...")
cql_res = evaluate_policy_across_all_products(db=db, policy_type="CQL", cql_agent=agent, num_products=20)

assert "avg_reward" in cql_res and "total_profit" in cql_res
assert "service_level" in cql_res and "avg_stockout" in cql_res and "final_inventory" in cql_res
assert len(cql_res["per_product"]) == 20, f"Expected 20 per-product entries, got {len(cql_res['per_product'])}"

print("[OK] Multi-product evaluation returned valid metrics for all 20 products.\n")

print("Step 2: Testing per-product CQL action breakdown printing...")
print_cql_per_product_breakdown(cql_res)

# Verify 0 DB mutations
inv_after = [(r.id, r.quantity) for r in db.query(InventoryRecord).all()]
orders_after = [(o.id, o.status) for o in db.query(Order).all()]
db.close()

assert inv_before == inv_after, "ERROR: InventoryRecord table was mutated!"
assert orders_before == orders_after, "ERROR: Order table was mutated!"
print("DATABASE ISOLATION VERIFIED: 100% Zero SQLite database mutations occurred.\n")

print("==================================================================")
print("MULTI-PRODUCT EVALUATION BENCHMARK TEST PASSED SUCCESSFULLY!")
print("==================================================================")
