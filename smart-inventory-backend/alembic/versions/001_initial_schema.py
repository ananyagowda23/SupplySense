"""Initial Schema Migration

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-09 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector
import database.models

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_tables = inspector.get_table_names()

    # 1. organizations
    if "organizations" not in existing_tables:
        op.create_table(
            "organizations",
            sa.Column("id", database.models.GUID(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("slug", sa.String(length=100), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug"),
        )
        op.create_index(op.f("ix_organizations_id"), "organizations", ["id"], unique=False)
        op.create_index(op.f("ix_organizations_slug"), "organizations", ["slug"], unique=True)

    # 2. users
    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", database.models.GUID(), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=100), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
        )
        op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
        op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    # 3. roles
    if "roles" not in existing_tables:
        op.create_table(
            "roles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=50), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )
        op.create_index(op.f("ix_roles_id"), "roles", ["id"], unique=False)

    # 4. permissions
    if "permissions" not in existing_tables:
        op.create_table(
            "permissions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(length=100), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )
        op.create_index(op.f("ix_permissions_id"), "permissions", ["id"], unique=False)

    # 5. role_permissions
    if "role_permissions" not in existing_tables:
        op.create_table(
            "role_permissions",
            sa.Column("role_id", sa.Integer(), nullable=False),
            sa.Column("permission_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("role_id", "permission_id"),
        )

    # 6. user_organizations
    if "user_organizations" not in existing_tables:
        op.create_table(
            "user_organizations",
            sa.Column("id", database.models.GUID(), nullable=False),
            sa.Column("user_id", database.models.GUID(), nullable=False),
            sa.Column("organization_id", database.models.GUID(), nullable=False),
            sa.Column("role_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "organization_id", name="uq_user_org"),
        )
        op.create_index(op.f("ix_user_organizations_organization_id"), "user_organizations", ["organization_id"], unique=False)
        op.create_index(op.f("ix_user_organizations_user_id"), "user_organizations", ["user_id"], unique=False)

    # 7. refresh_tokens
    if "refresh_tokens" not in existing_tables:
        op.create_table(
            "refresh_tokens",
            sa.Column("id", database.models.GUID(), nullable=False),
            sa.Column("user_id", database.models.GUID(), nullable=False),
            sa.Column("token_hash", sa.String(length=255), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token_hash"),
        )
        op.create_index(op.f("ix_refresh_tokens_token_hash"), "refresh_tokens", ["token_hash"], unique=True)
        op.create_index(op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False)

    # 8. audit_logs
    if "audit_logs" not in existing_tables:
        op.create_table(
            "audit_logs",
            sa.Column("id", database.models.GUID(), nullable=False),
            sa.Column("organization_id", database.models.GUID(), nullable=False),
            sa.Column("user_id", database.models.GUID(), nullable=True),
            sa.Column("action", sa.String(length=100), nullable=False),
            sa.Column("resource_type", sa.String(length=50), nullable=False),
            sa.Column("resource_id", sa.String(length=100), nullable=True),
            sa.Column("details", sa.JSON(), nullable=True),
            sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_audit_logs_organization_id"), "audit_logs", ["organization_id"], unique=False)
        op.create_index(op.f("ix_audit_logs_timestamp"), "audit_logs", ["timestamp"], unique=False)
        op.create_index(op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"], unique=False)

    # 9. recommendation_decisions
    if "recommendation_decisions" not in existing_tables:
        op.create_table(
            "recommendation_decisions",
            sa.Column("id", database.models.GUID(), nullable=False),
            sa.Column("organization_id", database.models.GUID(), nullable=False),
            sa.Column("recommendation_id", sa.String(length=100), nullable=False),
            sa.Column("user_id", database.models.GUID(), nullable=True),
            sa.Column("decision", sa.String(length=20), nullable=False),
            sa.Column("decision_notes", sa.String(length=500), nullable=True),
            sa.Column("modified_quantity", sa.Integer(), nullable=True),
            sa.Column("decision_date", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("organization_id", "recommendation_id", name="uq_org_rec"),
        )
        op.create_index(op.f("ix_recommendation_decisions_organization_id"), "recommendation_decisions", ["organization_id"], unique=False)
        op.create_index(op.f("ix_recommendation_decisions_recommendation_id"), "recommendation_decisions", ["recommendation_id"], unique=False)

    # 10. products
    if "products" not in existing_tables:
        op.create_table(
            "products",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", database.models.GUID(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("sku", sa.String(), nullable=False),
            sa.Column("category", sa.String(), nullable=False),
            sa.Column("unit_price", sa.Float(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("organization_id", "sku", name="uq_org_sku"),
        )
        op.create_index(op.f("ix_products_category"), "products", ["category"], unique=False)
        op.create_index(op.f("ix_products_id"), "products", ["id"], unique=False)
        op.create_index(op.f("ix_products_name"), "products", ["name"], unique=False)
        op.create_index(op.f("ix_products_organization_id"), "products", ["organization_id"], unique=False)
        op.create_index(op.f("ix_products_sku"), "products", ["sku"], unique=False)

    # 11. suppliers
    if "suppliers" not in existing_tables:
        op.create_table(
            "suppliers",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", database.models.GUID(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("location", sa.String(), nullable=False),
            sa.Column("lead_time_days", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("reliability_score", sa.Float(), nullable=False, server_default=sa.text("1.0")),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_suppliers_id"), "suppliers", ["id"], unique=False)
        op.create_index(op.f("ix_suppliers_name"), "suppliers", ["name"], unique=False)
        op.create_index(op.f("ix_suppliers_organization_id"), "suppliers", ["organization_id"], unique=False)

    # 12. inventory_records
    if "inventory_records" not in existing_tables:
        op.create_table(
            "inventory_records",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", database.models.GUID(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("location", sa.String(), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("reorder_point", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("safety_stock", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_inventory_records_id"), "inventory_records", ["id"], unique=False)
        op.create_index(op.f("ix_inventory_records_organization_id"), "inventory_records", ["organization_id"], unique=False)
        op.create_index(op.f("ix_inventory_records_product_id"), "inventory_records", ["product_id"], unique=False)
        op.create_index("idx_inventory_org_product_location", "inventory_records", ["organization_id", "product_id", "location"], unique=False)

    # 13. orders
    if "orders" not in existing_tables:
        op.create_table(
            "orders",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", database.models.GUID(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("supplier_id", sa.Integer(), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default=sa.text("'PENDING'")),
            sa.Column("order_date", sa.Date(), nullable=False),
            sa.Column("expected_delivery_date", sa.Date(), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_orders_id"), "orders", ["id"], unique=False)
        op.create_index(op.f("ix_orders_organization_id"), "orders", ["organization_id"], unique=False)
        op.create_index(op.f("ix_orders_product_id"), "orders", ["product_id"], unique=False)
        op.create_index(op.f("ix_orders_supplier_id"), "orders", ["supplier_id"], unique=False)

    # 14. demand_history
    if "demand_history" not in existing_tables:
        op.create_table(
            "demand_history",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("organization_id", database.models.GUID(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("demand_quantity", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_demand_history_date"), "demand_history", ["date"], unique=False)
        op.create_index(op.f("ix_demand_history_id"), "demand_history", ["id"], unique=False)
        op.create_index(op.f("ix_demand_history_organization_id"), "demand_history", ["organization_id"], unique=False)
        op.create_index(op.f("ix_demand_history_product_id"), "demand_history", ["product_id"], unique=False)
        op.create_index("idx_demand_history_org_product_date", "demand_history", ["organization_id", "product_id", "date"], unique=False)


def downgrade() -> None:
    # Non-destructive downgrade placeholder to prevent unexpected data loss
    pass
