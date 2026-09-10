import os
from pathlib import Path
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.environment import EnvironmentContext
from sqlalchemy import inspect

from config import DATABASE_URL
from database.db import SessionLocal, Base, engine
import database.models  # Ensures all 14 models are registered
from database.models import (
    Organization,
    User,
    Role,
    Permission,
    Product,
    Supplier,
    InventoryRecord,
    Order,
    DemandHistory,
    AuditLog,
    RecommendationDecision,
)


def test_alembic_config_loads_properly():
    """Verify alembic.ini configuration file exists and loads cleanly."""
    ini_path = Path(__file__).resolve().parent.parent / "alembic.ini"
    assert ini_path.exists(), "alembic.ini must exist in smart-inventory-backend"

    cfg = Config(str(ini_path))
    assert cfg.get_main_option("script_location") == "alembic"


def test_alembic_target_metadata_includes_all_models():
    """Verify target_metadata contains all 14 tenant and system tables."""
    expected_tables = {
        "organizations",
        "users",
        "roles",
        "permissions",
        "role_permissions",
        "user_organizations",
        "refresh_tokens",
        "audit_logs",
        "recommendation_decisions",
        "products",
        "suppliers",
        "inventory_records",
        "orders",
        "demand_history",
    }

    metadata_tables = set(Base.metadata.tables.keys())
    for table in expected_tables:
        assert table in metadata_tables, f"Table '{table}' missing from Base.metadata"


def test_alembic_migration_versions_exist():
    """Verify migration directory contains the initial non-destructive migration script."""
    ini_path = Path(__file__).resolve().parent.parent / "alembic.ini"
    cfg = Config(str(ini_path))
    script = ScriptDirectory.from_config(cfg)
    revisions = list(script.walk_revisions())

    assert len(revisions) >= 1, "At least one Alembic revision must exist"
    head_rev = revisions[0]
    assert head_rev.revision == "001_initial_schema"


def test_migration_script_has_no_destructive_commands():
    """Verify initial migration script does not contain destructive DROP or DELETE DDL/DML."""
    migration_file = (
        Path(__file__).resolve().parent.parent
        / "alembic"
        / "versions"
        / "001_initial_schema.py"
    )
    assert migration_file.exists(), "001_initial_schema.py must exist"

    content = migration_file.read_text(encoding="utf-8")
    assert "op.drop_table" not in content, "Initial migration must not drop tables"
    assert "op.execute('DELETE" not in content, "Initial migration must not delete rows"


def test_sqlite_development_database_accessible():
    """Verify local SQLite database connection remains functional."""
    assert "sqlite" in DATABASE_URL, "Development environment should use SQLite"
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    assert "products" in existing_tables
    assert "organizations" in existing_tables


def test_existing_data_counts_and_relationships_preserved():
    """Verify existing development records and foreign key relationships remain untouched:
    Products: 20, Suppliers: 5, Inventory: 40, Orders: 20, Demand History: 7300.
    """
    db = SessionLocal()
    try:
        assert db.query(Product).count() >= 20
        assert db.query(Supplier).count() == 5
        assert db.query(InventoryRecord).count() == 40
        assert db.query(Order).count() == 20
        assert db.query(DemandHistory).count() == 7300

        # Verify key foreign key relationships and tenant isolation bindings
        sample_prod = db.query(Product).first()
        assert sample_prod is not None
        assert sample_prod.organization_id is not None

        sample_org = db.query(Organization).filter(Organization.id == sample_prod.organization_id).first()
        assert sample_org is not None

        # Verify role and permission seeding
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        assert admin_role is not None
    finally:
        db.close()
