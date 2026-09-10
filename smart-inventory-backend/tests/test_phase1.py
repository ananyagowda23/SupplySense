import uuid
from datetime import datetime, date, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import DEFAULT_ORG_ID
from database.db import Base, init_db
from database.models import (
    GUID,
    Organization,
    User,
    Role,
    Permission,
    RolePermission,
    UserOrganization,
    RefreshToken,
    AuditLog,
    RecommendationDecision,
    Product,
    Supplier,
    InventoryRecord,
    Order,
    DemandHistory,
)


def test_phase1_database_data_integrity():
    """Verify that existing SQLite inventory.db database retains all existing records."""
    init_db()
    
    test_engine = create_engine("sqlite:///./inventory.db")
    TestSession = sessionmaker(bind=test_engine)
    session = TestSession()
    
    try:
        product_count = session.query(Product).count()
        supplier_count = session.query(Supplier).count()
        inventory_count = session.query(InventoryRecord).count()
        order_count = session.query(Order).count()
        demand_count = session.query(DemandHistory).count()
        org_count = session.query(Organization).count()
        role_count = session.query(Role).count()
        perm_count = session.query(Permission).count()
        
        print(f"Product Count: {product_count} (Expected: 20)")
        print(f"Supplier Count: {supplier_count} (Expected: 5)")
        print(f"Inventory Count: {inventory_count} (Expected: 40)")
        print(f"Order Count: {order_count} (Expected: 20)")
        print(f"DemandHistory Count: {demand_count} (Expected: 7300)")
        
        assert product_count == 20, f"Expected 20 products, got {product_count}"
        assert supplier_count == 5, f"Expected 5 suppliers, got {supplier_count}"
        assert inventory_count == 40, f"Expected 40 inventory records, got {inventory_count}"
        assert order_count == 20, f"Expected 20 orders, got {order_count}"
        assert demand_count == 7300, f"Expected 7300 demand records, got {demand_count}"
        assert org_count >= 1, "Expected at least 1 development organization"
        assert role_count == 3, "Expected 3 roles (ADMIN, MANAGER, SUPPLIER)"
        assert perm_count == 17, "Expected 17 granular permissions"
        
        # Verify organization_id on existing records
        first_product = session.query(Product).first()
        assert str(first_product.organization_id) == DEFAULT_ORG_ID, "Product organization_id mismatch"
        
        first_demand = session.query(DemandHistory).first()
        assert str(first_demand.organization_id) == DEFAULT_ORG_ID, "DemandHistory organization_id mismatch"
    finally:
        session.close()


def test_phase1_new_models_instantiation():
    """Verify that all Phase 1 multi-tenant models can be instantiated and persisted in SQLite."""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)
    session = TestSession()
    
    try:
        # Create Organization
        org = Organization(name="Test Corp", slug="test-corp")
        session.add(org)
        session.commit()
        session.refresh(org)
        assert org.id is not None
        assert org.name == "Test Corp"
        
        # Create User
        user = User(
            email="testuser@example.com",
            hashed_password="hashed_secret_password",
            full_name="Test User"
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None
        assert user.email == "testuser@example.com"
        
        # Create Role & Permission
        role = Role(id=10, name="TEST_ROLE", description="Test Role")
        perm = Permission(id=100, code="test.permission", description="Test Permission")
        session.add_all([role, perm])
        session.commit()
        
        rp = RolePermission(role_id=role.id, permission_id=perm.id)
        session.add(rp)
        session.commit()
        
        # Create UserOrganization
        uo = UserOrganization(user_id=user.id, organization_id=org.id, role_id=role.id)
        session.add(uo)
        session.commit()
        assert uo.id is not None
        
        # Create RefreshToken
        rt = RefreshToken(
            user_id=user.id,
            token_hash="sample_hashed_refresh_token",
            expires_at=datetime.now(timezone.utc)
        )
        session.add(rt)
        session.commit()
        assert rt.id is not None
        
        # Create AuditLog
        log = AuditLog(
            organization_id=org.id,
            user_id=user.id,
            action="TEST_ACTION",
            resource_type="PRODUCT",
            resource_id="101"
        )
        session.add(log)
        session.commit()
        assert log.id is not None
        
        # Create RecommendationDecision
        rd = RecommendationDecision(
            organization_id=org.id,
            recommendation_id="rec-test-01",
            user_id=user.id,
            decision="APPROVED",
            modified_quantity=300
        )
        session.add(rd)
        session.commit()
        assert rd.id is not None
        
        # Verify Tenant Domain Models creation with organization_id
        prod = Product(
            organization_id=org.id,
            name="Widget A",
            sku="WIDGET-001",
            category="Test",
            unit_price=25.0
        )
        sup = Supplier(
            organization_id=org.id,
            name="Supplier A",
            location="City X",
            lead_time_days=5,
            reliability_score=95.0
        )
        session.add_all([prod, sup])
        session.commit()
        
        inv = InventoryRecord(
            organization_id=org.id,
            product_id=prod.id,
            location="Warehouse 1",
            quantity=100,
            reorder_point=20,
            safety_stock=10
        )
        order = Order(
            organization_id=org.id,
            product_id=prod.id,
            supplier_id=sup.id,
            quantity=50,
            status="PENDING",
            order_date=date(2026, 9, 1),
            expected_delivery_date=date(2026, 9, 6)
        )
        dh = DemandHistory(
            organization_id=org.id,
            product_id=prod.id,
            date=date(2026, 9, 1),
            demand_quantity=15
        )
        session.add_all([inv, order, dh])
        session.commit()
        
        assert inv.id is not None
        assert order.id is not None
        assert dh.id is not None
    finally:
        session.close()


def test_phase1_composite_sku_uniqueness():
    """Verify that composite unique constraint (organization_id, sku) allows same SKU in different orgs."""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)
    session = TestSession()
    
    try:
        org1 = Organization(name="Org One", slug="org-one")
        org2 = Organization(name="Org Two", slug="org-two")
        session.add_all([org1, org2])
        session.commit()
        
        prod1 = Product(organization_id=org1.id, name="Item A", sku="COMMON-SKU", category="Cat", unit_price=10.0)
        prod2 = Product(organization_id=org2.id, name="Item B", sku="COMMON-SKU", category="Cat", unit_price=12.0)
        
        session.add_all([prod1, prod2])
        session.commit()
        
        assert prod1.id is not None
        assert prod2.id is not None
        assert prod1.sku == prod2.sku
        assert prod1.organization_id != prod2.organization_id
    finally:
        session.close()


if __name__ == "__main__":
    pytest.main(["-v", __file__])
