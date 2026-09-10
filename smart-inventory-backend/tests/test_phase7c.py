import pytest
import os
import sqlite3
import subprocess
from pathlib import Path
from sqlalchemy import create_engine, inspect

from config import DATABASE_URL
from database.db import SessionLocal
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
)
from scripts.migrate_sqlite_to_postgres import (
    get_sqlite_engine,
    get_source_table_counts,
    parse_uuid,
    migrate_data,
)


def test_sqlite_source_database_exists_and_readable():
    """Verify inventory.db exists and can be opened in read-only mode."""
    backend_dir = Path(__file__).resolve().parent.parent
    db_path = backend_dir / "inventory.db"
    assert db_path.exists(), "inventory.db must exist in smart-inventory-backend"

    engine = get_sqlite_engine(str(db_path))
    counts = get_source_table_counts(engine)

    # Dynamic check: verify all core business tables have records
    assert counts.get("demand_history", 0) == 7300
    assert counts.get("inventory_records", 0) == 40
    assert counts.get("orders", 0) == 20
    assert counts.get("suppliers", 0) == 5
    assert counts.get("products", 0) >= 20
    assert counts.get("organizations", 0) >= 1
    assert counts.get("roles", 0) == 3
    assert counts.get("permissions", 0) == 17


def test_uuid_parsing_utility():
    """Verify parse_uuid converts strings and UUID objects cleanly."""
    import uuid

    raw_str = "00000000-0000-0000-0000-000000000001"
    parsed = parse_uuid(raw_str)
    assert isinstance(parsed, uuid.UUID)
    assert str(parsed) == raw_str

    uuid_obj = uuid.uuid4()
    assert parse_uuid(uuid_obj) == uuid_obj
    assert parse_uuid(None) is None


def test_cli_help_flag_executes_cleanly():
    """Verify python scripts/migrate_sqlite_to_postgres.py --help exits 0."""
    backend_dir = Path(__file__).resolve().parent.parent
    cmd = ["python", "scripts/migrate_sqlite_to_postgres.py", "--help"]
    result = subprocess.run(cmd, cwd=str(backend_dir), capture_output=True, text=True)
    assert result.returncode == 0
    assert "Idempotent SQLite" in result.stdout or "usage:" in result.stdout


def test_cli_dry_run_executes_cleanly_without_modifying_source():
    """Verify python scripts/migrate_sqlite_to_postgres.py --dry-run completes cleanly."""
    backend_dir = Path(__file__).resolve().parent.parent
    db_path = backend_dir / "inventory.db"
    mtime_before = db_path.stat().st_mtime

    cmd = ["python", "scripts/migrate_sqlite_to_postgres.py", "--dry-run"]
    result = subprocess.run(cmd, cwd=str(backend_dir), capture_output=True, text=True)
    assert result.returncode == 0
    assert "DRY-RUN VALIDATION SUCCESSFUL" in result.stdout

    mtime_after = db_path.stat().st_mtime
    assert mtime_before == mtime_after, "inventory.db mtime must not change during dry-run"


def test_missing_postgresql_target_url_reports_pending_status():
    """Verify script exits cleanly when target PostgreSQL URL is absent."""
    backend_dir = Path(__file__).resolve().parent.parent
    cmd = ["python", "scripts/migrate_sqlite_to_postgres.py"]
    # Pass empty TARGET_DATABASE_URL / POSTGRES_URL / DATABASE_URL in env
    env = os.environ.copy()
    env["TARGET_DATABASE_URL"] = ""
    env["POSTGRES_URL"] = ""
    env["DATABASE_URL"] = "sqlite:///./inventory.db"

    result = subprocess.run(cmd, cwd=str(backend_dir), env=env, capture_output=True, text=True)
    assert result.returncode == 0
    assert "POSTGRESQL TARGET DATABASE NOT SPECIFIED / UNAVAILABLE" in result.stdout
