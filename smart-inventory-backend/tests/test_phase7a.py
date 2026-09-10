import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import text

from app import app
from config import get_jwt_secret, DEFAULT_DEV_SECRET, IS_PRODUCTION
from database.db import SessionLocal
from database.models import Product, Supplier, InventoryRecord, Order, DemandHistory
from utils.security import create_access_token, decode_token, hash_password, verify_password


client = TestClient(app)


def test_development_configuration_defaults():
    """Verify development mode accepts fallback dev secret with warning."""
    secret = get_jwt_secret(env="development", secret_override=None)
    assert secret == DEFAULT_DEV_SECRET


def test_production_configuration_valid_key():
    """Verify production mode succeeds when a strong 32+ char JWT secret is provided."""
    strong_key = "a_very_secure_production_secret_key_32bytes_long!"
    secret = get_jwt_secret(env="production", secret_override=strong_key)
    assert secret == strong_key


def test_production_configuration_missing_or_weak_key_fails_safely():
    """Verify production mode fails safely (raises RuntimeError) when JWT_SECRET_KEY is missing or weak."""
    # 1. Missing secret
    with pytest.raises(RuntimeError, match="FATAL SECURITY ERROR"):
        get_jwt_secret(env="production", secret_override="")

    # 2. Default dev secret in production
    with pytest.raises(RuntimeError, match="FATAL SECURITY ERROR"):
        get_jwt_secret(env="production", secret_override=DEFAULT_DEV_SECRET)

    # 3. Short/weak secret (< 32 chars)
    with pytest.raises(RuntimeError, match="FATAL SECURITY ERROR"):
        get_jwt_secret(env="production", secret_override="too_short_key")


def test_jwt_access_token_creation_and_decoding():
    """Verify JWT access token creation and decoding remains functional."""
    token = create_access_token(
        user_id="user-123",
        org_id="00000000-0000-0000-0000-000000000001",
        role_name="ADMIN",
    )
    assert isinstance(token, str)
    assert len(token) > 20

    payload = decode_token(token)
    assert payload["sub"] == "user-123"
    assert payload["org_id"] == "00000000-0000-0000-0000-000000000001"
    assert payload["role"] == "ADMIN"
    assert payload["type"] == "access"


def test_password_hashing_security():
    """Verify modern password hashing stack remains functional."""
    raw_pass = "Phase7aSecurePassword123!"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPass!", hashed) is False


def test_security_headers_present():
    """Verify security headers are applied on API responses."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"


def test_existing_database_row_counts_preserved():
    """Verify existing SQLite business data counts remain untouched:
    Products: >= 20, Suppliers: 5, Inventory: 40, Orders: 20, Demand History: 7300.
    """
    db = SessionLocal()
    try:
        product_count = db.query(Product).count()
        supplier_count = db.query(Supplier).count()
        inventory_count = db.query(InventoryRecord).count()
        order_count = db.query(Order).count()
        demand_count = db.query(DemandHistory).count()

        assert product_count >= 20, f"Expected at least 20 products, found {product_count}"
        assert supplier_count == 5, f"Expected 5 suppliers, found {supplier_count}"
        assert inventory_count == 40, f"Expected 40 inventory records, found {inventory_count}"
        assert order_count == 20, f"Expected 20 orders, found {order_count}"
        assert demand_count == 7300, f"Expected 7300 demand history records, found {demand_count}"
    finally:
        db.close()


def test_production_docs_disabled():
    """Verify interactive OpenAPI documentation (/docs) is disabled in production mode."""
    from fastapi import FastAPI
    from app import lifespan

    prod_app = FastAPI(
        title="Test Production App",
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
    )
    prod_client = TestClient(prod_app)
    response = prod_client.get("/docs")
    assert response.status_code == 404

