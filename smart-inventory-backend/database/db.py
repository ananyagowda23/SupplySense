import logging
import uuid
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from config import (
    DATABASE_URL,
    DEFAULT_ORG_ID,
    DEFAULT_ORG_NAME,
    DEFAULT_ORG_SLUG,
)

logger = logging.getLogger(__name__)

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if engine.dialect.name == "sqlite":
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db(reset: bool = False):
    """Safely initialize database tables and execute dialect-agnostic schema seeding
    for multi-tenancy without losing existing data.
    """
    from database import models  # Register models with Base.metadata

    if reset:
        Base.metadata.drop_all(bind=engine)

    # 1. Create any missing tables (organizations, users, roles, etc.)
    Base.metadata.create_all(bind=engine)

    # 2. Seed default records in a dialect-agnostic manner using ORM Session
    db = SessionLocal()
    try:
        # Seed default development organization
        org = db.query(models.Organization).filter_by(id=DEFAULT_ORG_ID).first()
        if not org:
            org = models.Organization(
                id=DEFAULT_ORG_ID,
                name=DEFAULT_ORG_NAME,
                slug=DEFAULT_ORG_SLUG,
                is_active=True,
            )
            db.add(org)

        # Seed default Roles
        roles_data = [
            (1, "ADMIN", "Administrator with full system & user access"),
            (2, "MANAGER", "Operations Lead with full supply-chain access"),
            (3, "SUPPLIER", "Supplier partner with restricted order & inventory view"),
        ]
        for role_id, role_name, role_desc in roles_data:
            existing_role = db.query(models.Role).filter_by(id=role_id).first()
            if not existing_role:
                db.add(models.Role(id=role_id, name=role_name, description=role_desc))

        # Seed default Permissions
        permissions_data = [
            (1, "products.read", "View product catalog"),
            (2, "products.write", "Create, edit or delete SKUs"),
            (3, "suppliers.read", "View supplier profiles"),
            (4, "suppliers.write", "Add or modify suppliers"),
            (5, "inventory.read", "View stock levels and reorder points"),
            (6, "inventory.write", "Update stock levels and safety stock"),
            (7, "orders.read", "View purchase orders"),
            (8, "orders.write", "Create or update purchase orders"),
            (9, "analytics.read", "View analytics and financial metrics"),
            (10, "simulation.run", "Execute scenario simulations"),
            (11, "recommendations.read", "View AI recommendations"),
            (12, "recommendations.approve", "Approve or override AI recommendations"),
            (13, "activity.read", "View operational audit feed"),
            (14, "settings.read", "View workspace configuration"),
            (15, "settings.write", "Update workspace settings"),
            (16, "users.read", "View organization members"),
            (17, "users.write", "Invite or modify user roles"),
        ]
        for perm_id, perm_code, perm_desc in permissions_data:
            existing_perm = db.query(models.Permission).filter_by(id=perm_id).first()
            if not existing_perm:
                db.add(models.Permission(id=perm_id, code=perm_code, description=perm_desc))

        # Seed default Role-Permissions mapping
        admin_perms = list(range(1, 18))
        manager_perms = list(range(1, 16))
        supplier_perms = [1, 3, 5, 7, 8, 13]

        role_perm_map = (
            [(1, p) for p in admin_perms]
            + [(2, p) for p in manager_perms]
            + [(3, p) for p in supplier_perms]
        )
        for r_id, p_id in role_perm_map:
            existing_rp = (
                db.query(models.RolePermission)
                .filter_by(role_id=r_id, permission_id=p_id)
                .first()
            )
            if not existing_rp:
                db.add(models.RolePermission(role_id=r_id, permission_id=p_id))

        db.commit()

        # Dialect-specific check for legacy column addition (if needed)
        inspector = inspect(engine)
        tenant_tables = [
            "products",
            "suppliers",
            "inventory_records",
            "orders",
            "demand_history",
        ]
        with engine.begin() as conn:
            for table_name in tenant_tables:
                if inspector.has_table(table_name):
                    columns = [c["name"] for c in inspector.get_columns(table_name)]
                    if "organization_id" not in columns:
                        logger.info(f"Adding organization_id column to '{table_name}'...")
                        conn.execute(
                            text(
                                f"ALTER TABLE {table_name} ADD COLUMN organization_id CHAR(36) NOT NULL DEFAULT '{DEFAULT_ORG_ID}'"
                            )
                        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    logger.info("Database initialization and multi-tenant schema check completed.")


def get_db():
    """Dependency that yields a database session per request and rolls back/closes safely."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
