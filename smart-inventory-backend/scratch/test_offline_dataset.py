import sys
import os
import numpy as np
from collections import Counter

dataset_path = os.path.join("training", "datasets", "offline_cql_dataset.npz")

print("==================================================================")
print("RUNNING OFFLINE RL DATASET VERIFICATION SUITE")
print("==================================================================\n")

assert os.path.exists(dataset_path), f"ERROR: Dataset file not found at '{dataset_path}'!"
print(f"Dataset File Path: '{os.path.abspath(dataset_path)}'")

data = np.load(dataset_path)

# 1. Required keys check
expected_keys = {"states", "actions", "rewards", "next_states", "dones"}
actual_keys = set(data.files)
assert expected_keys.issubset(actual_keys), f"Missing required keys! Expected {expected_keys}, got {actual_keys}"
print(f"[OK] All required keys present: {sorted(list(actual_keys))}")

states = data["states"]
actions = data["actions"]
rewards = data["rewards"]
next_states = data["next_states"]
dones = data["dones"]

N = len(states)
print(f"[OK] Total Transitions (N): {N:,}")

# 2. Shape checks
assert states.shape == (N, 9), f"states shape must be ({N}, 9), got {states.shape}"
assert next_states.shape == (N, 9), f"next_states shape must be ({N}, 9), got {next_states.shape}"
assert actions.shape == (N,), f"actions shape must be ({N},), got {actions.shape}"
assert rewards.shape == (N,), f"rewards shape must be ({N},), got {rewards.shape}"
assert dones.shape == (N,), f"dones shape must be ({N},), got {dones.shape}"
print("[OK] Array shapes verified successfully.")

# 3. Dtype checks
assert states.dtype == np.float32, f"states dtype must be float32, got {states.dtype}"
assert next_states.dtype == np.float32, f"next_states dtype must be float32, got {next_states.dtype}"
assert actions.dtype == np.int64, f"actions dtype must be int64, got {actions.dtype}"
assert rewards.dtype == np.float32, f"rewards dtype must be float32, got {rewards.dtype}"
assert dones.dtype == np.bool_, f"dones dtype must be bool, got {dones.dtype}"
print("[OK] Array dtypes verified successfully.")

# 4. Action diversity and valid range check
unique_actions = set(np.unique(actions))
assert unique_actions == {0, 1, 2}, f"Action set must contain {{0, 1, 2}}, got {unique_actions}"

counts = Counter(actions)
print(f"[OK] Action diversity verified across all 3 actions:")
print(f"    - NOOP (0):     {counts[0]:6,d} ({counts[0]/N*100:.2f}%)")
print(f"    - ORDER (1):    {counts[1]:6,d} ({counts[1]/N*100:.2f}%)")
print(f"    - EXPEDITE (2): {counts[2]:6,d} ({counts[2]/N*100:.2f}%)")

# 5. Finite / Non-null value check
assert np.all(np.isfinite(states)), "states contain NaN or Inf values!"
assert np.all(np.isfinite(next_states)), "next_states contain NaN or Inf values!"
assert np.all(np.isfinite(rewards)), "rewards contain NaN or Inf values!"
print("[OK] All elements in states, next_states, and rewards are finite (no NaN / Inf).")

# 6. Reward statistics check
print(f"[OK] Reward statistics: Mean=${np.mean(rewards):,.2f}, Min=${np.min(rewards):,.2f}, Max=${np.max(rewards):,.2f}")

# 7. Terminal states count check
term_count = int(np.sum(dones))
assert term_count > 0, "dones array contains 0 terminal states!"
print(f"[OK] Terminal states count: {term_count} ({term_count/N*100:.2f}% of transitions)")

print("\n==================================================================")
print("ALL OFFLINE DATASET VERIFICATION CHECKS PASSED SUCCESSFULLY!")
print("==================================================================")
