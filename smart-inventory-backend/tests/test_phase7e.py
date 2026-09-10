import pytest
import os
import re
from pathlib import Path
from fastapi.testclient import TestClient

from app import app
from services.model_manager import ModelManager


def test_single_canonical_render_yaml_at_repository_root():
    """Verify render.yaml exists ONLY at repository root and not inside backend directory."""
    backend_dir = Path(__file__).resolve().parent.parent
    repo_root = backend_dir.parent

    root_yaml = repo_root / "render.yaml"
    backend_yaml = backend_dir / "render.yaml"

    assert root_yaml.exists(), "Canonical render.yaml must exist at repository root"
    assert not backend_yaml.exists(), "render.yaml must NOT exist inside smart-inventory-backend directory"


def test_render_yaml_schema_and_service_specifications():
    """Verify render.yaml parameters, start command, pre-deploy migration, and plan specs."""
    repo_root = Path(__file__).resolve().parent.parent.parent
    root_yaml = repo_root / "render.yaml"
    content = root_yaml.read_text(encoding="utf-8")

    assert "type: web" in content
    assert "name: supplysense-backend" in content
    assert "runtime: python" in content
    assert "plan: free" in content
    assert "rootDir: smart-inventory-backend" in content
    assert 'buildCommand: "pip install -r requirements.txt"' in content
    assert 'preDeployCommand: "alembic upgrade head"' in content
    assert "gunicorn" in content
    assert "uvicorn.workers.UvicornWorker" in content
    assert "0.0.0.0:$PORT" in content
    assert "healthCheckPath: /health" in content

    # Database specs
    assert "name: supplysense-db" in content
    assert "databaseName: supplysense" in content
    assert "user: supplysense_user" in content

    # Environment variables check
    assert "ENVIRONMENT" in content
    assert "production" in content
    assert "DATABASE_URL" in content
    assert "fromDatabase:" in content
    assert "JWT_SECRET_KEY" in content
    assert "generateValue: true" in content
    assert "CORS_ORIGINS" in content
    assert "sync: false" in content


def test_no_credentials_hardcoded_in_render_yaml():
    """Verify render.yaml contains zero hardcoded database passwords or JWT secret values."""
    repo_root = Path(__file__).resolve().parent.parent.parent
    root_yaml = repo_root / "render.yaml"
    content = root_yaml.read_text(encoding="utf-8")

    assert "dev_secret_key" not in content.lower()
    assert "password:" not in content.lower()
    assert "postgres://" not in content
    assert "postgresql://" not in content


def test_health_check_preserves_strict_lazy_loading():
    """Verify calling /health endpoint does NOT trigger ML model loading."""
    # Reset model manager state
    ModelManager._cql_agent = None
    ModelManager._attempted_cql_load = False
    ModelManager._ppo_model = None
    ModelManager._attempted_ppo_load = False

    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200

    # Ensure /health responded with 200 without loading models
    assert ModelManager._cql_agent is None, "/health must NOT trigger CQL model load"
    assert ModelManager._ppo_model is None, "/health must NOT trigger PPO model load"
    assert ModelManager.is_cql_loaded() is False
    assert ModelManager.is_ppo_loaded() is False
