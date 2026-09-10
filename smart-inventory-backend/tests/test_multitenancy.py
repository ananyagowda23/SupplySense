from datetime import date
import pytest
from fastapi.testclient import TestClient

from app import app
from database.db import get_db
from database.models import (
    AuditLog,
    DemandHistory,
    InventoryRecord,
    Order,
    Organization,
    Product,
    Supplier,
    User,
    UserOrganization,
)
from utils.security import create_access_token, hash_password

client = TestClient(app)


@pytest.fixture(scope="module")
def tenant_environment():
    """Setup isolated ORG A and ORG B tenant environments with separate resources."""
    db = next(get_db())
    try:
        # Pre-cleanup in case of previous partial runs
        for slug in ["org-alpha", "org-beta"]:
            existing_org = db.query(Organization).filter(Organization.slug == slug).first()
            if existing_org:
                db.query(AuditLog).filter(AuditLog.organization_id == existing_org.id).delete()
                db.query(Order).filter(Order.organization_id == existing_org.id).delete()
                db.query(InventoryRecord).filter(InventoryRecord.organization_id == existing_org.id).delete()
                db.query(Product).filter(Product.organization_id == existing_org.id).delete()
                db.query(Supplier).filter(Supplier.organization_id == existing_org.id).delete()
                db.query(UserOrganization).filter(UserOrganization.organization_id == existing_org.id).delete()
                db.delete(existing_org)
        for email in ["user_a@alpha.com", "user_b@beta.com"]:
            user = db.query(User).filter(User.email == email).first()
            if user:
                db.delete(user)
        db.commit()

        # 1. Create Organization A & User A
        org_a = Organization(name="Organization Alpha", slug="org-alpha", is_active=True)
        db.add(org_a)
        db.commit()
        db.refresh(org_a)

        user_a = User(
            email="user_a@alpha.com",
            hashed_password=hash_password("Password123!"),
            full_name="User Alpha",
            is_active=True,
        )
        db.add(user_a)
        db.commit()
        db.refresh(user_a)

        uo_a = UserOrganization(user_id=user_a.id, organization_id=org_a.id, role_id=1)  # ADMIN
        db.add(uo_a)
        db.commit()

        # 2. Create Organization B & User B
        org_b = Organization(name="Organization Beta", slug="org-beta", is_active=True)
        db.add(org_b)
        db.commit()
        db.refresh(org_b)

        user_b = User(
            email="user_b@beta.com",
            hashed_password=hash_password("Password123!"),
            full_name="User Beta",
            is_active=True,
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)

        uo_b = UserOrganization(user_id=user_b.id, organization_id=org_b.id, role_id=1)  # ADMIN
        db.add(uo_b)
        db.commit()

        # 3. Create Tenant Domain Resources in ORG A
        prod_a = Product(organization_id=org_a.id, name="Alpha Widget", sku="ALPHA-001", category="Tech", unit_price=500.0)
        sup_a = Supplier(organization_id=org_a.id, name="Alpha Supplier", location="City Alpha", lead_time_days=3, reliability_score=98.0)
        db.add_all([prod_a, sup_a])
        db.commit()

        inv_a = InventoryRecord(organization_id=org_a.id, product_id=prod_a.id, location="Hub A", quantity=150, reorder_point=30, safety_stock=15)
        ord_a = Order(organization_id=org_a.id, product_id=prod_a.id, supplier_id=sup_a.id, quantity=100, status="PENDING", order_date=date(2026, 9, 1), expected_delivery_date=date(2026, 9, 5))
        log_a = AuditLog(organization_id=org_a.id, user_id=user_a.id, action="CREATE", resource_type="PRODUCT", resource_id=str(prod_a.id), details={"title": "Alpha Event"})
        dh_a = DemandHistory(organization_id=org_a.id, product_id=prod_a.id, date=date(2026, 9, 1), demand_quantity=120)
        db.add_all([inv_a, ord_a, log_a, dh_a])
        db.commit()

        # 4. Create Tenant Domain Resources in ORG B
        prod_b = Product(organization_id=org_b.id, name="Beta Gadget", sku="BETA-001", category="Tech", unit_price=750.0)
        sup_b = Supplier(organization_id=org_b.id, name="Beta Supplier", location="City Beta", lead_time_days=7, reliability_score=90.0)
        db.add_all([prod_b, sup_b])
        db.commit()

        inv_b = InventoryRecord(organization_id=org_b.id, product_id=prod_b.id, location="Hub B", quantity=80, reorder_point=20, safety_stock=10)
        ord_b = Order(organization_id=org_b.id, product_id=prod_b.id, supplier_id=sup_b.id, quantity=50, status="IN_TRANSIT", order_date=date(2026, 9, 2), expected_delivery_date=date(2026, 9, 9))
        log_b = AuditLog(organization_id=org_b.id, user_id=user_b.id, action="CREATE", resource_type="PRODUCT", resource_id=str(prod_b.id), details={"title": "Beta Event"})
        dh_b = DemandHistory(organization_id=org_b.id, product_id=prod_b.id, date=date(2026, 9, 1), demand_quantity=240)
        db.add_all([inv_b, ord_b, log_b, dh_b])
        db.commit()

        token_a = create_access_token(str(user_a.id), str(org_a.id), "ADMIN")
        token_b = create_access_token(str(user_b.id), str(org_b.id), "ADMIN")

        org_a_id = str(org_a.id)
        org_b_id = str(org_b.id)
        prod_a_id = prod_a.id
        prod_b_id = prod_b.id
        sup_a_id = sup_a.id
        sup_b_id = sup_b.id
        inv_a_id = inv_a.id
        inv_b_id = inv_b.id
        ord_a_id = ord_a.id
        ord_b_id = ord_b.id
        dh_a_id = dh_a.id
        dh_b_id = dh_b.id
    finally:
        db.close()

    yield {
        "org_a_id": org_a_id,
        "org_b_id": org_b_id,
        "user_a_headers": {"Authorization": f"Bearer {token_a}"},
        "user_b_headers": {"Authorization": f"Bearer {token_b}"},
        "prod_a_id": prod_a_id,
        "prod_b_id": prod_b_id,
        "sup_a_id": sup_a_id,
        "sup_b_id": sup_b_id,
        "inv_a_id": inv_a_id,
        "inv_b_id": inv_b_id,
        "ord_a_id": ord_a_id,
        "ord_b_id": ord_b_id,
        "dh_a_id": dh_a_id,
        "dh_b_id": dh_b_id,
    }

    # Teardown after tests run
    db = next(get_db())
    try:
        for slug in ["org-alpha", "org-beta"]:
            existing_org = db.query(Organization).filter(Organization.slug == slug).first()
            if existing_org:
                db.query(AuditLog).filter(AuditLog.organization_id == existing_org.id).delete()
                db.query(Order).filter(Order.organization_id == existing_org.id).delete()
                db.query(InventoryRecord).filter(InventoryRecord.organization_id == existing_org.id).delete()
                db.query(DemandHistory).filter(DemandHistory.organization_id == existing_org.id).delete()
                db.query(Product).filter(Product.organization_id == existing_org.id).delete()
                db.query(Supplier).filter(Supplier.organization_id == existing_org.id).delete()
                db.query(UserOrganization).filter(UserOrganization.organization_id == existing_org.id).delete()
                db.delete(existing_org)
        for email in ["user_a@alpha.com", "user_b@beta.com"]:
            user = db.query(User).filter(User.email == email).first()
            if user:
                db.delete(user)
        db.commit()
    finally:
        db.close()


def test_tenant_isolation_list_and_get_by_id(tenant_environment):
    """Verify listing and GET by ID return ONLY active tenant resources and 404 for cross-tenant attempts."""
    headers_a = tenant_environment["user_a_headers"]

    # 1. User A lists products -> returns ONLY Org A products
    resp = client.get("/api/products", headers=headers_a)
    assert resp.status_code == 200
    skus = [p["sku"] for p in resp.json()]
    assert "ALPHA-001" in skus
    assert "BETA-001" not in skus

    # 2. User A gets Org A product by ID -> 200 OK
    resp_a = client.get(f"/api/products/{tenant_environment['prod_a_id']}", headers=headers_a)
    assert resp_a.status_code == 200
    assert resp_a.json()["sku"] == "ALPHA-001"

    # 3. User A attempts getting Org B product by ID -> 404 NOT FOUND (No leakage)
    resp_b = client.get(f"/api/products/{tenant_environment['prod_b_id']}", headers=headers_a)
    assert resp_b.status_code == 404


def test_tenant_isolation_update_and_delete(tenant_environment):
    """Verify PUT and DELETE return 404 Not Found when attempting cross-tenant resource modification."""
    headers_a = tenant_environment["user_a_headers"]
    prod_b_id = tenant_environment["prod_b_id"]

    # Attempt updating Org B product
    update_resp = client.put(
        f"/api/products/{prod_b_id}",
        headers=headers_a,
        json={"name": "Hacked Product Name"},
    )
    assert update_resp.status_code == 404

    # Attempt deleting Org B product
    del_resp = client.delete(f"/api/products/{prod_b_id}", headers=headers_a)
    assert del_resp.status_code == 404


def test_tenant_isolation_cross_tenant_relationship_creation(tenant_environment):
    """Verify creating an Order referencing Org B Product or Org B Supplier yields 400 Bad Request."""
    headers_a = tenant_environment["user_a_headers"]

    # Attempt creating Order referencing Org B Product
    payload_bad_prod = {
        "product_id": tenant_environment["prod_b_id"],
        "supplier_id": tenant_environment["sup_a_id"],
        "quantity": 10,
        "status": "PENDING",
        "order_date": "2026-09-01",
        "expected_delivery_date": "2026-09-05",
    }
    resp_prod = client.post("/api/orders", headers=headers_a, json=payload_bad_prod)
    assert resp_prod.status_code == 400
    assert "does not exist in your organization" in resp_prod.json()["detail"]

    # Attempt creating Order referencing Org B Supplier
    payload_bad_sup = {
        "product_id": tenant_environment["prod_a_id"],
        "supplier_id": tenant_environment["sup_b_id"],
        "quantity": 10,
        "status": "PENDING",
        "order_date": "2026-09-01",
        "expected_delivery_date": "2026-09-05",
    }
    resp_sup = client.post("/api/orders", headers=headers_a, json=payload_bad_sup)
    assert resp_sup.status_code == 400
    assert "does not exist in your organization" in resp_sup.json()["detail"]


def test_tenant_isolation_activity_analytics_simulation(tenant_environment):
    """Verify Activity logs, Analytics, and Simulation endpoints return only tenant-isolated data."""
    headers_a = tenant_environment["user_a_headers"]

    # 1. Activity Feed -> returns ONLY Org A events
    act_resp = client.get("/api/activity", headers=headers_a)
    assert act_resp.status_code == 200
    titles = [item["title"] for item in act_resp.json()]
    assert "Alpha Event" in titles
    assert "Beta Event" not in titles

    # 2. Analytics Summary -> calculates ONLY Org A inventory value
    analytics_resp = client.get("/api/analytics/summary", headers=headers_a)
    assert analytics_resp.status_code == 200
    kpis = analytics_resp.json()["kpis"]
    total_val_raw = kpis[0]["rawNumericValue"]
    assert total_val_raw == 150 * 500.0  # 150 units of Alpha Widget @ 500.0

    # 3. Simulation -> cross-tenant product ID yields 404 Not Found
    sim_resp = client.post(
        "/api/simulate",
        headers=headers_a,
        json={
            "product_id": tenant_environment["prod_b_id"],
            "simulation_days": 7,
            "initial_inventory": 50,
        },
    )
    assert sim_resp.status_code == 404


def test_tenant_isolation_demand_history(tenant_environment):
    """Verify tenant isolation and relationship validation for all Demand History operations."""
    headers_a = tenant_environment["user_a_headers"]
    dh_b_id = tenant_environment["dh_b_id"]

    # 1. GET by ID cross-tenant -> 404
    assert client.get(f"/api/demand-history/{dh_b_id}", headers=headers_a).status_code == 404

    # 2. PUT cross-tenant -> 404
    put_resp = client.put(
        f"/api/demand-history/{dh_b_id}",
        headers=headers_a,
        json={"demand_quantity": 999},
    )
    assert put_resp.status_code == 404

    # 3. DELETE cross-tenant -> 404
    del_resp = client.delete(f"/api/demand-history/{dh_b_id}", headers=headers_a)
    assert del_resp.status_code == 404

    # 4. POST with cross-tenant product_id -> 400 Bad Request
    post_cross = client.post(
        "/api/demand-history",
        headers=headers_a,
        json={
            "product_id": tenant_environment["prod_b_id"],
            "date": "2026-09-05",
            "demand_quantity": 50,
        },
    )
    assert post_cross.status_code == 400
    assert "does not exist in your organization" in post_cross.json()["detail"]

    # 5. POST with same-tenant product_id -> 201 Created
    post_valid = client.post(
        "/api/demand-history",
        headers=headers_a,
        json={
            "product_id": tenant_environment["prod_a_id"],
            "date": "2026-09-05",
            "demand_quantity": 55,
        },
    )
    assert post_valid.status_code == 201
    created_id = post_valid.json()["id"]

    # 6. PUT same-tenant -> 200 OK
    put_valid = client.put(
        f"/api/demand-history/{created_id}",
        headers=headers_a,
        json={"demand_quantity": 60},
    )
    assert put_valid.status_code == 200
    assert put_valid.json()["demand_quantity"] == 60

    # 7. DELETE same-tenant -> 204 No Content
    del_valid = client.delete(f"/api/demand-history/{created_id}", headers=headers_a)
    assert del_valid.status_code == 204

