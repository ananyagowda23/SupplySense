import os
import sys
import random
import argparse
import numpy as np

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.db import SessionLocal
from database.models import InventoryRecord, Order
from services.rl_environment import SupplyChainEnv


def evaluate_policy(
    db,
    policy_name: str,
    action_choice: int = 0,
    model=None,
    num_episodes: int = 5,
    max_steps: int = 30,
) -> dict:
    """Evaluate a policy (heuristic baseline or trained RL model) over num_episodes."""
    rewards_list = []
    profits_list = []
    service_levels_list = []
    stockouts_list = []
    final_invs_list = []

    for ep in range(num_episodes):
        env = SupplyChainEnv(
            db=db,
            product_id=1,
            initial_inventory=50,
            max_steps=max_steps,
            fixed_order_quantity=50,
        )
        obs, info = env.reset(seed=42 + ep)
        done = False
        ep_reward = 0.0

        while not done:
            if model is not None:
                action, _ = model.predict(obs, deterministic=True)
                action = int(action)
            else:
                action = action_choice  # Baseline heuristic action (0=NOOP, 1=ORDER, 2=EXPEDITE)

            obs, reward, terminated, truncated, info = env.step(action)
            ep_reward += reward
            done = terminated or truncated

        rewards_list.append(ep_reward)
        profits_list.append(info.get("cumulative_profit", ep_reward))
        service_levels_list.append(info.get("service_level", 0.0))
        stockouts_list.append(info.get("stockout_quantity", 0.0))
        final_invs_list.append(info.get("ending_inventory", 0))

    return {
        "policy_name": policy_name,
        "avg_reward": round(float(np.mean(rewards_list)), 2),
        "total_profit": round(float(np.mean(profits_list)), 2),
        "avg_service_level": round(float(np.mean(service_levels_list)), 2),
        "avg_stockout": round(float(np.mean(stockouts_list)), 2),
        "avg_final_inv": round(float(np.mean(final_invs_list)), 2),
    }


def main(total_timesteps: int = 10000):
    print("==================================================================")
    print("RL TRAINING & EVALUATION PIPELINE (STABLE-BASELINES3 PPO)")
    print("==================================================================\n")

    # Enforce random seeds for reproducibility
    random.seed(42)
    np.random.seed(42)

    db = SessionLocal()

    # Record initial database state for isolation check
    inv_before = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
    orders_before = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]

    print("Step 1: Evaluating Baseline Heuristic Policies (30-day episodes)...")
    baseline_noop = evaluate_policy(db, "Always NOOP", action_choice=0, num_episodes=5)
    baseline_order = evaluate_policy(db, "Always ORDER", action_choice=1, num_episodes=5)
    baseline_expedite = evaluate_policy(db, "Always EXPEDITE", action_choice=2, num_episodes=5)

    print("  - Always NOOP:      Avg Reward = {:,.2f} | Total Profit = ${:,.2f} | Service Level = {}%".format(
        baseline_noop['avg_reward'], baseline_noop['total_profit'], baseline_noop['avg_service_level']
    ))
    print("  - Always ORDER:     Avg Reward = {:,.2f} | Total Profit = ${:,.2f} | Service Level = {}%".format(
        baseline_order['avg_reward'], baseline_order['total_profit'], baseline_order['avg_service_level']
    ))
    print("  - Always EXPEDITE:  Avg Reward = {:,.2f} | Total Profit = ${:,.2f} | Service Level = {}%\n".format(
        baseline_expedite['avg_reward'], baseline_expedite['total_profit'], baseline_expedite['avg_service_level']
    ))

    print("Step 2: Preparing Stable-Baselines3 PPO Training Environment...")
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import DummyVecEnv

    def make_env():
        return SupplyChainEnv(
            db=db,
            product_id=1,
            initial_inventory=50,
            max_steps=30,
            fixed_order_quantity=50,
        )

    vec_env = DummyVecEnv([make_env])

    print(f"Step 3: Training PPO Agent for {total_timesteps} timesteps...")
    model = PPO(
        "MlpPolicy",
        vec_env,
        verbose=1,
        learning_rate=0.0003,
        n_steps=128,
        batch_size=64,
        seed=42,
    )
    model.learn(total_timesteps=total_timesteps)

    # Save Model
    save_dir = os.path.join(os.path.dirname(__file__), "saved_models")
    os.makedirs(save_dir, exist_ok=True)
    model_path = os.path.join(save_dir, "ppo_supply_chain.zip")
    model.save(model_path)
    print(f"\nStep 4: Saved trained PPO model to '{model_path}'.")

    # Load Model
    loaded_model = PPO.load(model_path)
    print("Step 5: Loaded trained PPO model successfully from disk.")

    # Evaluate Loaded Model
    print("Step 6: Evaluating Trained PPO Agent over 5 episodes...")
    ppo_eval = evaluate_policy(db, "PPO RL Agent", model=loaded_model, num_episodes=5)

    # Print Comparison Table with SEPARATE columns for Avg Episode Reward and Total Profit
    print("\n=========================================================================================================")
    print("POLICY COMPARISON SUMMARY (30-DAY EPISODES)")
    print("=========================================================================================================")
    header = f"{'Policy':<18} | {'Avg Episode Reward':<19} | {'Total Profit ($)':<17} | {'Service Level (%)':<17} | {'Avg Stockout':<12} | {'Final Inv':<9}"
    print(header)
    print("-" * len(header))

    results = [baseline_noop, baseline_order, baseline_expedite, ppo_eval]
    for r in results:
        reward_str = f"{r['avg_reward']:,.2f}"
        profit_str = f"${r['total_profit']:,.2f}"
        sl_str = f"{r['avg_service_level']:.2f}%"
        print(f"{r['policy_name']:<18} | {reward_str:<19} | {profit_str:<17} | {sl_str:<17} | {r['avg_stockout']:<12} | {r['avg_final_inv']:<9}")
    print("=========================================================================================================\n")

    # Verify Database Isolation
    inv_after = [(r.id, r.product_id, r.location, r.quantity) for r in db.query(InventoryRecord).all()]
    orders_after = [(o.id, o.product_id, o.supplier_id, o.quantity, o.status) for o in db.query(Order).all()]

    assert inv_before == inv_after, "ERROR: InventoryRecord table was mutated!"
    assert orders_before == orders_after, "ERROR: Order table was mutated!"
    print("DATABASE ISOLATION VERIFIED: 100% Zero SQLite database mutations occurred during training & evaluation.")

    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PPO RL Agent on SupplyChainEnv")
    parser.add_argument(
        "--timesteps",
        type=int,
        default=10000,
        help="Configurable PPO training timesteps (default: 10000)",
    )
    args = parser.parse_args()
    main(total_timesteps=args.timesteps)
