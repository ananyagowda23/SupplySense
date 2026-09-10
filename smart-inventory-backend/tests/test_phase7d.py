import pytest
import os
import numpy as np
from pathlib import Path
from fastapi.testclient import TestClient

from config import BASE_DIR, CQL_MODEL_PATH, PPO_MODEL_PATH
from services.model_manager import ModelManager
from app import app


def test_model_files_exist_and_sizes_match():
    """Verify model files exist at expected paths and check file sizes."""
    cql_file = Path(CQL_MODEL_PATH)
    ppo_file = Path(PPO_MODEL_PATH)

    assert cql_file.exists(), f"CQL model file missing at '{cql_file}'"
    assert ppo_file.exists(), f"PPO model file missing at '{ppo_file}'"

    cql_size = cql_file.stat().st_size
    ppo_size = ppo_file.stat().st_size

    assert cql_size == 150817, f"Expected CQL model size 150817 bytes, found {cql_size}"
    assert ppo_size == 146166, f"Expected PPO model size 146166 bytes, found {ppo_size}"


def test_model_paths_resolved_from_base_dir():
    """Verify model paths resolve anchored to project BASE_DIR and not working directory."""
    cql_path = Path(CQL_MODEL_PATH)
    ppo_path = Path(PPO_MODEL_PATH)

    assert cql_path.is_absolute()
    assert ppo_path.is_absolute()
    assert str(BASE_DIR) in str(cql_path)
    assert str(BASE_DIR) in str(ppo_path)


def test_lazy_loading_and_inference_verification():
    """Verify models lazy-load on demand and perform inference cleanly."""
    models_status = ModelManager.verify_models()

    assert models_status["cql"]["exists"] is True
    assert models_status["cql"]["loaded"] is True
    assert models_status["cql"]["size_bytes"] == 150817
    assert models_status["cql"]["sample_inference_action"] in [0, 1, 2]

    assert models_status["ppo"]["exists"] is True
    assert models_status["ppo"]["loaded"] is True
    assert models_status["ppo"]["size_bytes"] == 146166
    assert models_status["ppo"]["sample_inference_action"] in [0, 1, 2]


def test_cql_inference_direct():
    """Verify CQL agent predicts action deterministically given 9-dim observation."""
    cql = ModelManager.get_cql_agent()
    assert cql is not None

    obs = np.zeros(9, dtype=np.float32)
    action = cql.select_action(obs, deterministic=True)
    assert isinstance(action, (int, np.integer))
    assert 0 <= action <= 2


def test_ppo_inference_direct():
    """Verify PPO model predicts action deterministically given 9-dim observation."""
    ppo = ModelManager.get_ppo_agent()
    assert ppo is not None

    obs = np.zeros(9, dtype=np.float32)
    action, _ = ppo.predict(obs, deterministic=True)
    assert isinstance(action, (int, np.ndarray, np.integer))


def test_missing_model_file_produces_actionable_error_without_crashing(caplog):
    """Verify missing model file path logs an actionable error and returns None cleanly."""
    import services.model_manager as mm

    # Temporarily set missing path
    original_cql_path = mm.CQL_MODEL_PATH
    try:
        mm.CQL_MODEL_PATH = str(BASE_DIR / "training" / "saved_models" / "non_existent_cql.pt")
        # Reset attempt flag for testing
        mm.ModelManager._attempted_cql_load = False
        mm.ModelManager._cql_agent = None

        agent = mm.ModelManager.get_cql_agent()
        assert agent is None, "Missing model should return None"

        assert "MODEL LOADING ERROR" in caplog.text or "Actionable Fix" in caplog.text
    finally:
        mm.CQL_MODEL_PATH = original_cql_path
        mm.ModelManager._attempted_cql_load = False
        mm.ModelManager._cql_agent = None


def test_fastapi_starts_successfully_with_model_manager():
    """Verify FastAPI application client initializes cleanly with ModelManager."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "cql_model_loaded" in data
