import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import CHAR, TypeDecorator

from config import DEFAULT_ORG_ID
from database.db import Base



class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL UUID type, otherwise CHAR(36) in SQLite.
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            else:
                return str(uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if isinstance(value, uuid.UUID):
                return value
            else:
                return uuid.UUID(str(value))


# 1. Multi-Tenant Organizations
class Organization(Base):
    """SQLAlchemy model for enterprise tenant organizations."""

    __tablename__ = "organizations"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user_memberships = relationship(
        "UserOrganization", back_populates="organization", cascade="all, delete-orphan"
    )
    products = relationship(
        "Product", back_populates="organization", cascade="all, delete-orphan"
    )
    suppliers = relationship(
        "Supplier", back_populates="organization", cascade="all, delete-orphan"
    )
    inventory_records = relationship(
        "InventoryRecord", back_populates="organization", cascade="all, delete-orphan"
    )
    orders = relationship(
        "Order", back_populates="organization", cascade="all, delete-orphan"
    )
    demand_histories = relationship(
        "DemandHistory", back_populates="organization", cascade="all, delete-orphan"
    )
    audit_logs = relationship(
        "AuditLog", back_populates="organization", cascade="all, delete-orphan"
    )
    recommendation_decisions = relationship(
        "RecommendationDecision",
        back_populates="organization",
        cascade="all, delete-orphan",
    )


# 2. Production Users
class User(Base):
    """SQLAlchemy model for system user accounts."""

    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    org_memberships = relationship(
        "UserOrganization", back_populates="user", cascade="all, delete-orphan"
    )
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )


# 3. Roles & Permissions (RBAC)
class Role(Base):
    """SQLAlchemy model for roles (ADMIN, MANAGER, SUPPLIER)."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))

    # Relationships
    role_permissions = relationship(
        "RolePermission", back_populates="role", cascade="all, delete-orphan"
    )


class Permission(Base):
    """SQLAlchemy model for granular system permissions (e.g. inventory.read)."""

    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))

    # Relationships
    role_permissions = relationship(
        "RolePermission", back_populates="permission", cascade="all, delete-orphan"
    )


class RolePermission(Base):
    """Junction table associating roles to permissions."""

    __tablename__ = "role_permissions"

    role_id = Column(
        Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    permission_id = Column(
        Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True
    )

    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")


# 4. User-Organization Multi-Tenant Junction
class UserOrganization(Base):
    """Junction table mapping users to organizations with assigned per-org role."""

    __tablename__ = "user_organizations"
    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_user_org"),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    organization_id = Column(
        GUID,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="org_memberships")
    organization = relationship("Organization", back_populates="user_memberships")
    role = relationship("Role")


# 5. Refresh Tokens
class RefreshToken(Base):
    """SQLAlchemy model for persistent, rotatable OAuth2 refresh tokens."""

    __tablename__ = "refresh_tokens"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    token_hash = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")


# 6. Audit Logs
class AuditLog(Base):
    """SQLAlchemy model for persistent operational audit events."""

    __tablename__ = "audit_logs"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        GUID,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        default=DEFAULT_ORG_ID,
    )
    user_id = Column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100))
    details = Column(JSON)
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    organization = relationship("Organization", back_populates="audit_logs")
    user = relationship("User")


# 7. Recommendation Decisions (Persistent AI Decision Override Store)
class RecommendationDecision(Base):
    """SQLAlchemy model for persistent AI recommendation decisions."""

    __tablename__ = "recommendation_decisions"
    __table_args__ = (
        UniqueConstraint("organization_id", "recommendation_id", name="uq_org_rec"),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        GUID,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        default=DEFAULT_ORG_ID,
    )
    recommendation_id = Column(String(100), nullable=False, index=True)
    user_id = Column(
        GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decision = Column(String(20), nullable=False)  # APPROVED | MODIFIED | REJECTED
    decision_notes = Column(String(500))
    modified_quantity = Column(Integer)
    decision_date = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    organization = relationship("Organization", back_populates="recommendation_decisions")
    user = relationship("User")


# 8. Tenant-Owned Domain Models
class Product(Base):
    """SQLAlchemy model for tenant-owned products table."""

    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("organization_id", "sku", name="uq_org_sku"),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        GUID,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        default=DEFAULT_ORG_ID,
    )
    name = Column(String, index=True, nullable=False)
    sku = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    unit_price = Column(Float, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="products")
    inventory_records = relationship(
        "InventoryRecord", back_populates="product", cascade="all, delete-orphan"
    )
    orders = relationship(
        "Order", back_populates="product", cascade="all, delete-orphan"
    )
    demand_history = relationship(
        "DemandHistory", back_populates="product", cascade="all, delete-orphan"
    )


class Supplier(Base):
    """SQLAlchemy model for tenant-owned suppliers table."""

    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        GUID,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        default=DEFAULT_ORG_ID,
    )
    name = Column(String, index=True, nullable=False)
    location = Column(String, nullable=False)
    lead_time_days = Column(Integer, nullable=False, default=0)
    reliability_score = Column(Float, nullable=False, default=1.0)

    # Relationships
    organization = relationship("Organization", back_populates="suppliers")
    orders = relationship(
        "Order", back_populates="supplier", cascade="all, delete-orphan"
    )


class InventoryRecord(Base):
    """SQLAlchemy model for tenant-owned inventory stock records."""

    __tablename__ = "inventory_records"
    __table_args__ = (
        Index(
            "idx_inventory_org_product_location",
            "organization_id",
            "product_id",
            "location",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        GUID,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        default=DEFAULT_ORG_ID,
    )
    product_id = Column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location = Column(String, nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    reorder_point = Column(Integer, default=0, nullable=False)
    safety_stock = Column(Integer, default=0, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="inventory_records")
    product = relationship("Product", back_populates="inventory_records")


class Order(Base):
    """SQLAlchemy model for tenant-owned supplier purchase orders."""

    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        GUID,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        default=DEFAULT_ORG_ID,
    )
    product_id = Column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    supplier_id = Column(
        Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="orders")
    product = relationship("Product", back_populates="orders")
    supplier = relationship("Supplier", back_populates="orders")


class DemandHistory(Base):
    """SQLAlchemy model for tenant-owned product historical demand data."""

    __tablename__ = "demand_history"
    __table_args__ = (
        Index(
            "idx_demand_history_org_product_date",
            "organization_id",
            "product_id",
            "date",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        GUID,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        default=DEFAULT_ORG_ID,
    )

    product_id = Column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date = Column(Date, nullable=False, index=True)
    demand_quantity = Column(Integer, nullable=False, default=0)

    # Relationships
    organization = relationship("Organization", back_populates="demand_histories")
    product = relationship("Product", back_populates="demand_history")
