from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database.db import Base


class Product(Base):
    """SQLAlchemy model for the products table."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    sku = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    unit_price = Column(Float, nullable=False)

    # Relationships
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
    """SQLAlchemy model for the suppliers table."""

    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    location = Column(String, nullable=False)
    lead_time_days = Column(Integer, nullable=False, default=0)
    reliability_score = Column(Float, nullable=False, default=1.0)

    # Relationships
    orders = relationship(
        "Order", back_populates="supplier", cascade="all, delete-orphan"
    )


class InventoryRecord(Base):
    """SQLAlchemy model for localized inventory stock records."""

    __tablename__ = "inventory_records"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(
        Integer, ForeignKey("products.id"), nullable=False, index=True
    )
    location = Column(String, nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    reorder_point = Column(Integer, default=0, nullable=False)
    safety_stock = Column(Integer, default=0, nullable=False)

    # Relationships
    product = relationship("Product", back_populates="inventory_records")


class Order(Base):
    """SQLAlchemy model for supplier purchase orders."""

    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(
        Integer, ForeignKey("products.id"), nullable=False, index=True
    )
    supplier_id = Column(
        Integer, ForeignKey("suppliers.id"), nullable=False, index=True
    )
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date, nullable=False)

    # Relationships
    product = relationship("Product", back_populates="orders")
    supplier = relationship("Supplier", back_populates="orders")


class DemandHistory(Base):
    """SQLAlchemy model for product historical demand data."""

    __tablename__ = "demand_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(
        Integer, ForeignKey("products.id"), nullable=False, index=True
    )
    date = Column(Date, nullable=False, index=True)
    demand_quantity = Column(Integer, nullable=False, default=0)

    # Relationships
    product = relationship("Product", back_populates="demand_history")
