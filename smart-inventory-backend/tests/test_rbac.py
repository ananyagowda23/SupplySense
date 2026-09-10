import pytest
from fastapi.testclient import TestClient

from app import app
from database.db import get_db
from database.models import Organization, Role, User, UserOrganization
from utils.security import create_access_token, hash_password

client = TestClient(app)


@pytest.fixture(scope="module")
def rbac_users():
    """Setup test organization with ADMIN, MANAGER, and SUPPLIER users."""
    db = next(get_db())
    try:
        # Pre-cleanup in case of prior test runs
        existing_org = db.query(Organization).filter(Organization.slug == "rbac-test-org").first()
        if existing_org:
            db.query(UserOrganization).filter(UserOrganization.organization_id == existing_org.id).delete()
            db.delete(existing_org)
        for email in ["admin_rbac@test.com", "mgr_rbac@test.com", "sup_rbac@test.com"]:
            user = db.query(User).filter(User.email == email).first()
            if user:
                db.delete(user)
        db.commit()

        # Create RBAC Test Organization
        org = Organization(name="RBAC Test Org", slug="rbac-test-org", is_active=True)
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create Admin User
        admin_user = User(
            email="admin_rbac@test.com",
            hashed_password=hash_password("Password123!"),
            full_name="RBAC Admin",
            is_active=True,
        )
        # Create Manager User
        mgr_user = User(
            email="mgr_rbac@test.com",
            hashed_password=hash_password("Password123!"),
            full_name="RBAC Manager",
            is_active=True,
        )
        # Create Supplier User
        sup_user = User(
            email="sup_rbac@test.com",
            hashed_password=hash_password("Password123!"),
            full_name="RBAC Supplier",
            is_active=True,
        )
        db.add_all([admin_user, mgr_user, sup_user])
        db.commit()
        db.refresh(admin_user)
        db.refresh(mgr_user)
        db.refresh(sup_user)

        # Assign Roles: Admin=1, Manager=2, Supplier=3
        uo_admin = UserOrganization(user_id=admin_user.id, organization_id=org.id, role_id=1)
        uo_mgr = UserOrganization(user_id=mgr_user.id, organization_id=org.id, role_id=2)
        uo_sup = UserOrganization(user_id=sup_user.id, organization_id=org.id, role_id=3)
        db.add_all([uo_admin, uo_mgr, uo_sup])
        db.commit()

        # Create Access Tokens
        admin_token = create_access_token(str(admin_user.id), str(org.id), "ADMIN")
        mgr_token = create_access_token(str(mgr_user.id), str(org.id), "MANAGER")
        sup_token = create_access_token(str(sup_user.id), str(org.id), "SUPPLIER")

        org_id = str(org.id)
    finally:
        db.close()

    yield {
        "org_id": org_id,
        "admin_headers": {"Authorization": f"Bearer {admin_token}"},
        "mgr_headers": {"Authorization": f"Bearer {mgr_token}"},
        "sup_headers": {"Authorization": f"Bearer {sup_token}"},
    }

    # Teardown after tests run
    db = next(get_db())
    try:
        existing_org = db.query(Organization).filter(Organization.slug == "rbac-test-org").first()
        if existing_org:
            db.query(UserOrganization).filter(UserOrganization.organization_id == existing_org.id).delete()
            db.delete(existing_org)
        for email in ["admin_rbac@test.com", "mgr_rbac@test.com", "sup_rbac@test.com"]:
            user = db.query(User).filter(User.email == email).first()
            if user:
                db.delete(user)
        db.commit()
    finally:
        db.close()


def test_rbac_unauthenticated_requests_return_401():
    """Verify that unauthenticated access to protected endpoints yields 401 Unauthorized."""
    endpoints = [
        ("GET", "/api/products"),
        ("GET", "/api/suppliers"),
        ("GET", "/api/inventory"),
        ("GET", "/api/orders"),
        ("GET", "/api/demand-history"),
        ("POST", "/api/demand-history"),
        ("PUT", "/api/demand-history/1"),
        ("DELETE", "/api/demand-history/1"),
        ("GET", "/api/forecast/1"),
        ("GET", "/api/recommendations"),
        ("GET", "/api/analytics/summary"),
        ("GET", "/api/activity"),
        ("GET", "/api/settings"),
    ]
    for method, path in endpoints:
        resp = client.request(method, path)
        assert resp.status_code == 401, f"Expected 401 for {method} {path}, got {resp.status_code}"


def test_rbac_admin_permissions(rbac_users):
    """Verify ADMIN user can access all operational and administrative endpoints."""
    headers = rbac_users["admin_headers"]

    assert client.get("/api/products", headers=headers).status_code == 200
    assert client.get("/api/suppliers", headers=headers).status_code == 200
    assert client.get("/api/inventory", headers=headers).status_code == 200
    assert client.get("/api/orders", headers=headers).status_code == 200
    assert client.get("/api/demand-history", headers=headers).status_code == 200
    assert client.get("/api/analytics/summary", headers=headers).status_code == 200
    assert client.get("/api/activity", headers=headers).status_code == 200
    assert client.get("/api/settings", headers=headers).status_code == 200


def test_rbac_manager_permissions(rbac_users):
    """Verify MANAGER user can access operations, analytics, recommendations, and simulations."""
    headers = rbac_users["mgr_headers"]

    assert client.get("/api/products", headers=headers).status_code == 200
    assert client.get("/api/suppliers", headers=headers).status_code == 200
    assert client.get("/api/inventory", headers=headers).status_code == 200
    assert client.get("/api/orders", headers=headers).status_code == 200
    assert client.get("/api/demand-history", headers=headers).status_code == 200
    assert client.get("/api/recommendations", headers=headers).status_code == 200
    assert client.get("/api/analytics/summary", headers=headers).status_code == 200


def test_rbac_supplier_restricted_permissions(rbac_users):
    """Verify SUPPLIER user can access assigned operations, but is REJECTED with 403 Forbidden for analytics, simulations, recommendation approvals, and inventory/demand modifications."""
    headers = rbac_users["sup_headers"]

    # Allowed endpoints for SUPPLIER (products.read, suppliers.read, inventory.read, orders.read, activity.read)
    assert client.get("/api/products", headers=headers).status_code == 200
    assert client.get("/api/suppliers", headers=headers).status_code == 200
    assert client.get("/api/inventory", headers=headers).status_code == 200
    assert client.get("/api/orders", headers=headers).status_code == 200
    assert client.get("/api/demand-history", headers=headers).status_code == 200
    assert client.get("/api/activity", headers=headers).status_code == 200

    # Disallowed endpoints for SUPPLIER (analytics.read, simulation.run, recommendations.approve, settings.write, inventory.write)
    assert client.get("/api/analytics/summary", headers=headers).status_code == 403
    assert client.get("/api/recommendations", headers=headers).status_code == 403
    assert client.post("/api/simulate/run", headers=headers, json={"durationDays": 30}).status_code == 403
    assert client.post("/api/recommendations/rec-001/decision", headers=headers, json={"decision": "APPROVED"}).status_code == 403
    assert client.put("/api/settings", headers=headers, json={"profile": {"name": "Hacker"}}).status_code == 403
    assert client.post("/api/demand-history", headers=headers, json={"product_id": 1, "date": "2026-09-01", "demand_quantity": 10}).status_code == 403
    assert client.put("/api/demand-history/1", headers=headers, json={"demand_quantity": 20}).status_code == 403
    assert client.delete("/api/demand-history/1", headers=headers).status_code == 403

