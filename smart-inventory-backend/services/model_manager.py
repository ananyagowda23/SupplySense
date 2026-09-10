import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import numpy as np

from config import CQL_MODEL_PATH, PPO_MODEL_PATH
from training.cql_model import CQLAgent

logger = logging.getLogger(__name__)


class ModelManager:
    """Singleton Manager for lazy-loading and managing trained ML models safely."""

    _cql_agent: Optional[CQLAgent] = None
    _attempted_cql_load: bool = False

    _ppo_model = None
    _attempted_ppo_load: bool = False

    @classmethod
    def get_cql_agent(cls) -> Optional[CQLAgent]:
        """Lazy-load and return singleton CQLAgent instance if available."""
        if not cls._attempted_cql_load:
            cls._attempted_cql_load = True
            cql_path = Path(CQL_MODEL_PATH)
            if cql_path.exists():
                try:
                    agent = CQLAgent(state_dim=9, action_dim=3, hidden_dim=128)
                    agent.load_model(str(cql_path))
                    cls._cql_agent = agent
                    logger.info(f"Successfully loaded CQL model from '{cql_path}' ({cql_path.stat().st_size} bytes)")
                except Exception as e:
                    logger.error(
                        f"MODEL LOADING ERROR: Failed to load CQL model from '{cql_path}': {e}. "
                        f"Actionable Fix: Verify model file integrity at '{cql_path}' or re-train via 'python training/cql_model.py'."
                    )
            else:
                logger.error(
                    f"MODEL LOADING ERROR: CQL model file missing at expected path '{cql_path}'. "
                    f"Actionable Fix: Ensure trained weights file exists at '{cql_path}' or train via 'python training/cql_model.py'."
                )
        return cls._cql_agent

    @classmethod
    def get_ppo_agent(cls):
        """Lazy-load and return singleton Stable-Baselines3 PPO model if available."""
        if not cls._attempted_ppo_load:
            cls._attempted_ppo_load = True
            ppo_path = Path(PPO_MODEL_PATH)
            if ppo_path.exists():
                try:
                    from stable_baselines3 import PPO
                    cls._ppo_model = PPO.load(str(ppo_path))
                    logger.info(f"Successfully loaded PPO model from '{ppo_path}' ({ppo_path.stat().st_size} bytes)")
                except Exception as e:
                    logger.error(
                        f"MODEL LOADING ERROR: Failed to load PPO model from '{ppo_path}': {e}. "
                        f"Actionable Fix: Verify zip archive integrity at '{ppo_path}' or re-train via 'python training/ppo_train.py'."
                    )
            else:
                logger.error(
                    f"MODEL LOADING ERROR: PPO model file missing at expected path '{ppo_path}'. "
                    f"Actionable Fix: Ensure trained zip archive exists at '{ppo_path}' or train via 'python training/ppo_train.py'."
                )
        return cls._ppo_model

    @classmethod
    def is_cql_loaded(cls) -> bool:
        """Check if CQL model is currently loaded and available for inference."""
        return cls._cql_agent is not None

    @classmethod
    def is_ppo_loaded(cls) -> bool:
        """Check if PPO model is currently loaded and available for inference."""
        return cls._ppo_model is not None

    @classmethod
    def verify_models(cls) -> Dict[str, Any]:
        """Verification helper returning model file details, load status, and sample inference results."""
        cql_path = Path(CQL_MODEL_PATH)
        ppo_path = Path(PPO_MODEL_PATH)

        cql_agent = cls.get_cql_agent()
        ppo_model = cls.get_ppo_agent()

        dummy_obs = np.zeros(9, dtype=np.float32)

        cql_inference = None
        if cql_agent is not None:
            cql_inference = int(cql_agent.select_action(dummy_obs, deterministic=True))

        ppo_inference = None
        if ppo_model is not None:
            action, _ = ppo_model.predict(dummy_obs, deterministic=True)
            ppo_inference = int(action)

        return {
            "cql": {
                "path": str(cql_path),
                "exists": cql_path.exists(),
                "size_bytes": cql_path.stat().st_size if cql_path.exists() else 0,
                "loaded": cql_agent is not None,
                "sample_inference_action": cql_inference,
            },
            "ppo": {
                "path": str(ppo_path),
                "exists": ppo_path.exists(),
                "size_bytes": ppo_path.stat().st_size if ppo_path.exists() else 0,
                "loaded": ppo_model is not None,
                "sample_inference_action": ppo_inference,
            },
        }
