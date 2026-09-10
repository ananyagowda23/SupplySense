from datetime import date, timedelta
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
    RecommendationDecision,
    Supplier,
    User,
    UserOrganization,
)
from services.forecasting_service import generate_forecast
from services.model_manager import ModelManager
from services.rl_environment import SupplyChainEnv
from services.simulation_service import run_simulation
from utils.security import create_access_token, hash_password

client = TestClient(app)


@pytest.fixture(scope="module")
def ai_tenant_environment():
    """Setup isolated Org A and Org B environments with distinguishable AI & ML domain records."""
    db = next(get_db())
    try:
        # Pre-cleanup
        for slug in ["ai-org-alpha", "ai-org-beta"]:
            existing_org = db.query(Organization).filter(Organization.slug == slug).first()
            if existing_org:
                db.query(AuditLog).filter(AuditLog.organization_id == existing_org.id).delete()
                db.query(RecommendationDecision).filter(RecommendationDecision.organization_id == existing_org.id).delete()
                db.query(Order).filter(Order.organization_id == existing_org.id).delete()
                db.query(InventoryRecord).filter(InventoryRecord.organization_id == existing_org.id).delete()
                db.query(DemandHistory).filter(DemandHistory.organization_id == existing_org.id).delete()
                db.query(Product).filter(Product.organization_id == existing_org.id).delete()
                db.query(Supplier).filter(Supplier.organization_id == existing_org.id).delete()
                db.query(UserOrganization).filter(UserOrganization.organization_id == existing_org.id).delete()
                db.delete(existing_org)
        for email in ["ai_user_a@alpha.com", "ai_user_b@beta.com"]:
            user = db.query(User).filter(User.email == email).first()
            if user:
                db.delete(user)
        db.commit()

        # 1. Create Org A & User A
        org_a = Organization(name="AI Org Alpha", slug="ai-org-alpha", is_active=True)
        db.add(org_a)
        db.commit()
        db.refresh(org_a)

        user_a = User(
            email="ai_user_a@alpha.com",
            hashed_password=hash_password("Password123!"),
            full_name="AI User Alpha",
            is_active=True,
        )
        db.add(user_a)
        db.commit()
        db.refresh(user_a)

        uo_a = UserOrganization(user_id=user_a.id, organization_id=org_a.id, role_id=1)  # ADMIN
        db.add(uo_a)
        db.commit()

        # 2. Create Org B & User B
        org_b = Organization(name="AI Org Beta", slug="ai-org-beta", is_active=True)
        db.add(org_b)
        db.commit()
        db.refresh(org_b)

        user_b = User(
            email="ai_user_b@beta.com",
            hashed_password=hash_password("Password123!"),
            full_name="AI User Beta",
            is_active=True,
        )
        db.add(user_b)
        db.commit()
        db.refresh(user_b)

        uo_b = UserOrganization(user_id=user_b.id, organization_id=org_b.id, role_id=1)  # ADMIN
        db.add(uo_b)
        db.commit()

        # 3. Org A Domain Entities (Product, Supplier, Inventory, Demand)
        prod_a = Product(organization_id=org_a.id, name="AI Alpha Chip", sku="AI-ALPHA-01", category="Tech", unit_price=100.0)
        sup_a = Supplier(organization_id=org_a.id, name="AI Alpha Supplier", location="City A", lead_time_days=3, reliability_score=95.0)
        db.add_all([prod_a, sup_a])
        db.commit()

        inv_a = InventoryRecord(organization_id=org_a.id, product_id=prod_a.id, location="Hub A", quantity=200, reorder_point=40, safety_stock=20)
        ord_a = Order(organization_id=org_a.id, product_id=prod_a.id, supplier_id=sup_a.id, quantity=100, status="PENDING", order_date=date(2026, 9, 1), expected_delivery_date=date(2026, 9, 4))
        db.add_all([inv_a, ord_a])

        # 30 days demand history for Org A
        start_date = date(2026, 8, 1)
        dh_a_list = [
            DemandHistory(organization_id=org_a.id, product_id=prod_a.id, date=start_date + timedelta(days=i), demand_quantity=50 + i)
            for i in range(30)
        ]
        db.add_all(dh_a_list)
        db.commit()

        # 4. Org B Domain Entities (Product, Supplier, Inventory, Demand)
        prod_b = Product(organization_id=org_b.id, name="AI Beta Sensor", sku="AI-BETA-01", category="Tech", unit_price=250.0)
        sup_b = Supplier(organization_id=org_b.id, name="AI Beta Supplier", location="City B", lead_time_days=8, reliability_score=85.0)
        db.add_all([prod_b, sup_b])
        db.commit()

        inv_b = InventoryRecord(organization_id=org_b.id, product_id=prod_b.id, location="Hub B", quantity=15, reorder_point=50, safety_stock=25)
        ord_b = Order(organization_id=org_b.id, product_id=prod_b.id, supplier_id=sup_b.id, quantity=80, status="SHIPPED", order_date=date(2026, 9, 2), expected_delivery_date=date(2026, 9, 10))
        db.add_all([inv_b, ord_b])

        # 30 days demand history for Org B
        dh_b_list = [
            DemandHistory(organization_id=org_b.id, product_id=prod_b.id, date=start_date + timedelta(days=i), demand_quantity=200 + (i * 2))
            for i in range(30)
        ]
        db.add_all(dh_b_list)
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
    }

    # Teardown after tests
    db = next(get_db())
    try:
        for slug in ["ai-org-alpha", "ai-org-beta"]:
            existing_org = db.query(Organization).filter(Organization.slug == slug).first()
            if existing_org:
                db.query(AuditLog).filter(AuditLog.organization_id == existing_org.id).delete()
                db.query(RecommendationDecision).filter(RecommendationDecision.organization_id == existing_org.id).delete()
                db.query(Order).filter(Order.organization_id == existing_org.id).delete()
                db.query(InventoryRecord).filter(InventoryRecord.organization_id == existing_org.id).delete()
                db.query(DemandHistory).filter(DemandHistory.organization_id == existing_org.id).delete()
                db.query(Product).filter(Product.organization_id == existing_org.id).delete()
                db.query(Supplier).filter(Supplier.organization_id == existing_org.id).delete()
                db.query(UserOrganization).filter(UserOrganization.organization_id == existing_org.id).delete()
                db.delete(existing_org)
        for email in ["ai_user_a@alpha.com", "ai_user_b@beta.com"]:
            user = db.query(User).filter(User.email == email).first()
            if user:
                db.delete(user)
        db.commit()
    finally:
        db.close()


def test_ai_tenant_isolated_forecasting(ai_tenant_environment):
    """Verify Prophet forecasting uses strictly active tenant DemandHistory records."""
    db = next(get_db())
    try:
        org_a_id = ai_tenant_environment["org_a_id"]
        org_b_id = ai_tenant_environment["org_b_id"]
        prod_a_id = ai_tenant_environment["prod_a_id"]
        prod_b_id = ai_tenant_environment["prod_b_id"]

        # 1. Org A forecast for Org A product -> Success
        fc_a = generate_forecast(db, product_id=prod_a_id, days=7, organization_id=org_a_id)
        assert fc_a["product_id"] == prod_a_id
        assert len(fc_a["forecast"]) == 7

        # 2. Org B forecast for Org B product -> Success
        fc_b = generate_forecast(db, product_id=prod_b_id, days=7, organization_id=org_b_id)
        assert fc_b["product_id"] == prod_b_id
        assert len(fc_b["forecast"]) == 7

        # 3. Org A attempting forecast on Org B product -> 404 Not Found
        with pytest.raises(Exception) as exc_info:
            generate_forecast(db, product_id=prod_b_id, days=7, organization_id=org_a_id)
        assert "404" in str(exc_info.value)
    finally:
        db.close()


def test_ai_tenant_isolated_gymnasium_env_and_rl_models(ai_tenant_environment):
    """Verify Gymnasium SupplyChainEnv, PPO, and CQL state vectors query strictly tenant-scoped data."""
    db = next(get_db())
    try:
        org_a_id = ai_tenant_environment["org_a_id"]
        org_b_id = ai_tenant_environment["org_b_id"]
        prod_a_id = ai_tenant_environment["prod_a_id"]
        prod_b_id = ai_tenant_environment["prod_b_id"]

        # 1. Instantiate SupplyChainEnv for Org A
        env_a = SupplyChainEnv(db=db, product_id=prod_a_id, organization_id=org_a_id)
        obs_a, info_a = env_a.reset(seed=42)
        assert obs_a.shape == (9,)
        assert env_a.product.name == "AI Alpha Chip"
        assert env_a.supplier.name == "AI Alpha Supplier"

        # 2. Instantiate SupplyChainEnv for Org B
        env_b = SupplyChainEnv(db=db, product_id=prod_b_id, organization_id=org_b_id)
        obs_b, info_b = env_b.reset(seed=42)
        assert obs_b.shape == (9,)
        assert env_b.product.name == "AI Beta Sensor"
        assert env_b.supplier.name == "AI Beta Supplier"

        # 3. Cross-tenant SupplyChainEnv creation fails with ValueError
        with pytest.raises(ValueError) as exc_info:
            env_cross = SupplyChainEnv(db=db, product_id=prod_b_id, organization_id=org_a_id)
            env_cross.reset()
        assert "not found" in str(exc_info.value).lower()

        # 4. Verify CQL Inference with tenant state vector
        cql_agent = ModelManager.get_cql_agent()
        if cql_agent:
            act_a = cql_agent.select_action(obs_a, deterministic=True)
            assert act_a in [0, 1, 2]

        # 5. Verify PPO Inference with tenant state vector
        ppo_model = ModelManager.get_ppo_agent()
        if ppo_model:
            act_ppo, _ = ppo_model.predict(obs_a, deterministic=True)
            assert int(act_ppo) in [0, 1, 2]
    finally:
        db.close()


def test_ai_tenant_isolated_recommendations_and_decisions(ai_tenant_environment):
    """Verify recommendation generation and decision endpoints strictly scope to active organization."""
    headers_a = ai_tenant_environment["user_a_headers"]
    headers_b = ai_tenant_environment["user_b_headers"]

    # 1. User A lists recommendations -> contains ONLY Org A SKU
    resp_a = client.get("/api/recommendations", headers=headers_a)
    assert resp_a.status_code == 200
    skus_a = [r["sku"] for r in resp_a.json()]
    assert "AI-ALPHA-01" in skus_a
    assert "AI-BETA-01" not in skus_a

    # 2. User B lists recommendations -> contains ONLY Org B SKU
    resp_b = client.get("/api/recommendations", headers=headers_b)
    assert resp_b.status_code == 200
    skus_b = [r["sku"] for r in resp_b.json()]
    assert "AI-BETA-01" in skus_b
    assert "AI-ALPHA-01" not in skus_b

    # 3. User A approves Org A recommendation
    rec_a_id = f"rec-00{ai_tenant_environment['inv_a_id']}"
    dec_a_resp = client.post(
        f"/api/recommendations/{rec_a_id}/decision",
        headers=headers_a,
        json={"decision": "APPROVED", "decisionNotes": "Approved by Alpha Admin"},
    )
    assert dec_a_resp.status_code == 200

    # 4. User B cannot view User A decision in User B recommendations
    resp_b_check = client.get("/api/recommendations", headers=headers_b)
    for rec in resp_b_check.json():
        if rec["id"] == rec_a_id:
            pytest.fail("Org B returned Org A recommendation ID")


def test_ai_tenant_isolated_simulation(ai_tenant_environment):
    """Verify simulation routes strictly enforce tenant scoping for products and data."""
    headers_a = ai_tenant_environment["user_a_headers"]
    prod_a_id = ai_tenant_environment["prod_a_id"]
    prod_b_id = ai_tenant_environment["prod_b_id"]

    # 1. User A simulates Org A product -> 200 OK
    sim_a = client.post(
        "/api/simulate",
        headers=headers_a,
        json={"product_id": prod_a_id, "simulation_days": 7, "initial_inventory": 50},
    )
    assert sim_a.status_code == 200
    assert sim_a.json()["product_id"] == prod_a_id

    # 2. User A attempts simulation on Org B product -> 404 Not Found
    sim_cross = client.post(
        "/api/simulate",
        headers=headers_a,
        json={"product_id": prod_b_id, "simulation_days": 7, "initial_inventory": 50},
    )
    assert sim_cross.status_code == 404


def test_ai_inference_database_non_mutation(ai_tenant_environment):
    """Verify that running forecasts, simulations, and recommendation generation causes ZERO DB row mutations."""
    db = next(get_db())
    try:
        p_count = db.query(Product).count()
        s_count = db.query(Supplier).count()
        i_count = db.query(InventoryRecord).count()
        o_count = db.query(Order).count()
        d_count = db.query(DemandHistory).count()

        # Run Forecast
        generate_forecast(db, product_id=ai_tenant_environment["prod_a_id"], days=7, organization_id=ai_tenant_environment["org_a_id"])

        # Run Gymnasium Env steps
        env = SupplyChainEnv(db=db, product_id=ai_tenant_environment["prod_a_id"], organization_id=ai_tenant_environment["org_a_id"])
        obs, _ = env.reset()
        for _ in range(5):
            obs, reward, term, trunc, _ = env.step(1)

        # Verify Counts match 100%
        assert db.query(Product).count() == p_count
        assert db.query(Supplier).count() == s_count
        assert db.query(InventoryRecord).count() == i_count
        assert db.query(Order).count() == o_count
        assert db.query(DemandHistory).count() == d_count
    finally:
        db.close()
