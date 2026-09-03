from sqlalchemy import create_engine, event, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./inventory.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db(reset: bool = False):
    """Safely initialize or migrate database tables for SQLite."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    # If resetting or if products table has old 'quantity' column, drop tables to handle SQLite schema change safely
    should_recreate = reset
    if "products" in tables:
        columns = [c["name"] for c in inspector.get_columns("products")]
        if "quantity" in columns:
            should_recreate = True

    if should_recreate:
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency that yields a database session per request and closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
