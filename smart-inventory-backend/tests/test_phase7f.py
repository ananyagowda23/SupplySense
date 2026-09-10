import pytest
import os
import json
from pathlib import Path


def test_eas_json_exists_and_valid():
    """Verify eas.json exists at root and contains valid profiles without hardcoded URLs."""
    backend_dir = Path(__file__).resolve().parent.parent
    repo_root = backend_dir.parent

    eas_file = repo_root / "eas.json"
    assert eas_file.exists(), "eas.json must exist at repository root"

    with open(eas_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "build" in data, "eas.json must define build profiles"
    build = data["build"]

    assert "development" in build
    assert "preview" in build
    assert "production" in build

    # Verify production profile does NOT hardcode an unverified URL
    prod_env = build["production"].get("env", {})
    assert "EXPO_PUBLIC_API_URL" not in prod_env, "Production profile should not hardcode an unverified URL"


def test_app_json_contains_bundle_and_package_identifiers():
    """Verify app.json contains android.package and ios.bundleIdentifier."""
    backend_dir = Path(__file__).resolve().parent.parent
    repo_root = backend_dir.parent

    app_file = repo_root / "app.json"
    assert app_file.exists(), "app.json must exist at repository root"

    with open(app_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    expo = data.get("expo", {})
    ios = expo.get("ios", {})
    android = expo.get("android", {})

    assert ios.get("bundleIdentifier") == "com.supplysense.app"
    assert android.get("package") == "com.supplysense.app"


def test_frontend_config_and_api_client_consistency():
    """Verify constants/config.ts and services/apiClient.ts share API_BASE_URL resolution."""
    backend_dir = Path(__file__).resolve().parent.parent
    repo_root = backend_dir.parent

    config_file = repo_root / "constants" / "config.ts"
    client_file = repo_root / "services" / "apiClient.ts"

    assert config_file.exists()
    assert client_file.exists()

    config_content = config_file.read_text(encoding="utf-8")
    client_content = client_file.read_text(encoding="utf-8")

    assert "EXPO_PUBLIC_API_URL" in config_content
    assert "http://localhost:8000" in config_content
    assert "FATAL CONFIG ERROR" in config_content
    assert "API_BASE_URL" in client_content
    assert "from '../constants/config'" in client_content


def test_no_secrets_in_eas_and_app_json():
    """Verify eas.json and app.json contain zero API keys or secret credentials."""
    backend_dir = Path(__file__).resolve().parent.parent
    repo_root = backend_dir.parent

    eas_content = (repo_root / "eas.json").read_text(encoding="utf-8")
    app_content = (repo_root / "app.json").read_text(encoding="utf-8")

    for content in [eas_content, app_content]:
        assert "password" not in content.lower()
        assert "secret" not in content.lower()
        assert "api_key" not in content.lower()
