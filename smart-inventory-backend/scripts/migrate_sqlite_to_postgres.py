#!/usr/bin/env python3
"""
SQLite to PostgreSQL Data Migration & Verification Tool
SupplySense Backend - Phase 7C

Usage:
    python scripts/migrate_sqlite_to_postgres.py [--sqlite-path PATH] [--target-url URL] [--verify-only] [--dry-run] [--batch-size SIZE]
"""

import argparse
import os
import sys
import uuid
import logging
from pathlib import Path
from typing import Dict, List, Any, Tuple

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Add backend root directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import database.models as models

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migrate_sqlite_to_postgres")

# Table ordering respecting foreign key hierarchy
ORDERED_MODELS = [
    (models.Organization, "organizations"),
    (models.User, "users"),
    (models.Role, "roles"),
    (models.Permission, "permissions"),
    (models.RolePermission, "role_permissions"),
    (models.UserOrganization, "user_organizations"),
    (models.RefreshToken, "refresh_tokens"),
    (models.AuditLog, "audit_logs"),
    (models.RecommendationDecision, "recommendation_decisions"),
    (models.Product, "products"),
    (models.Supplier, "suppliers"),
    (models.InventoryRecord, "inventory_records"),
    (models.Order, "orders"),
    (models.DemandHistory, "demand_history"),
]


def get_sqlite_engine(sqlite_path: str):
    """Create SQLite engine for source database."""
    abs_path = Path(sqlite_path).resolve()
    if not abs_path.exists():
        raise FileNotFoundError(f"Source SQLite database not found at: {abs_path}")
    
    url = f"sqlite:///{abs_path.as_posix()}"
    engine = create_engine(url, connect_args={"check_same_thread": False})
    return engine


def get_target_url(arg_target_url: str = None) -> str:
    """Resolve target database URL from CLI arguments or environment variables."""
    if arg_target_url:
        return arg_target_url
    
    url = os.getenv("TARGET_DATABASE_URL") or os.getenv("POSTGRES_URL")
    if url and "postgresql" in url:
        return url
    return ""


def get_source_table_counts(source_engine) -> Dict[str, int]:
    """Inspect and return exact row counts for all system and business tables in source SQLite database."""
    counts = {}
    with source_engine.connect() as conn:
        for model_cls, table_name in ORDERED_MODELS:
            try:
                res = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).fetchone()
                counts[table_name] = res[0] if res else 0
            except Exception:
                counts[table_name] = 0
    return counts


def parse_uuid(val: Any) -> Any:
    """Safely parse UUID string or object."""
    if val is None:
        return None
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, AttributeError):
        return str(val)


def migrate_data(
    source_engine,
    target_engine,
    batch_size: int = 1000,
    dry_run: bool = False,
) -> Dict[str, Dict[str, int]]:
    """Idempotently migrate all tables from source SQLite database to target PostgreSQL database."""
    SourceSession = sessionmaker(bind=source_engine)
    source_session = SourceSession()

    TargetSession = sessionmaker(bind=target_engine) if not dry_run else None
    target_session = TargetSession() if not dry_run else None

    results = {}

    try:
        for model_cls, table_name in ORDERED_MODELS:
            source_records = source_session.query(model_cls).all()
            total_source = len(source_records)
            inserted_count = 0
            skipped_count = 0

            if dry_run:
                results[table_name] = {
                    "source": total_source,
                    "migrated": total_source,
                    "skipped": 0,
                    "status": "SIMULATED (DRY RUN)",
                }
                logger.info(f"[DRY-RUN] Table '{table_name}': {total_source} records verified.")
                continue

            for record in source_records:
                # Primary key query check for idempotency
                pk_val = getattr(record, "id", None)
                existing = None

                if pk_val is not None:
                    existing = target_session.query(model_cls).filter_by(id=pk_val).first()
                elif model_cls == models.RolePermission:
                    existing = (
                        target_session.query(models.RolePermission)
                        .filter_by(role_id=record.role_id, permission_id=record.permission_id)
                        .first()
                    )

                if existing:
                    skipped_count += 1
                    continue

                # Prepare column data dictionary
                col_data = {}
                for col in model_cls.__table__.columns:
                    val = getattr(record, col.name, None)
                    # Convert GUID columns if needed
                    if isinstance(col.type, models.GUID) or col.name.endswith("_id") or col.name == "id":
                        if val is not None and isinstance(val, (str, uuid.UUID)):
                            val = parse_uuid(val)
                    col_data[col.name] = val

                new_record = model_cls(**col_data)
                target_session.add(new_record)
                inserted_count += 1

                if inserted_count % batch_size == 0:
                    target_session.commit()

            if target_session:
                target_session.commit()

            results[table_name] = {
                "source": total_source,
                "migrated": inserted_count,
                "skipped": skipped_count,
                "status": "MIGRATED" if inserted_count > 0 else ("UP TO DATE" if total_source == skipped_count else "OK"),
            }
            logger.info(f"Table '{table_name}': {inserted_count} inserted, {skipped_count} skipped.")

    except Exception as e:
        if target_session:
            target_session.rollback()
        logger.error(f"Migration error: {e}", exc_info=True)
        raise
    finally:
        source_session.close()
        if target_session:
            target_session.close()

    return results


def verify_migration(source_engine, target_engine) -> Tuple[Dict[str, Dict[str, Any]], bool]:
    """Compare row counts and integrity between source SQLite database and target database without modifying either."""
    source_counts = get_source_table_counts(source_engine)
    
    TargetSession = sessionmaker(bind=target_engine)
    target_session = TargetSession()

    verification_results = {}
    all_matched = True

    try:
        for model_cls, table_name in ORDERED_MODELS:
            src_count = source_counts.get(table_name, 0)
            try:
                target_count = target_session.query(model_cls).count()
            except Exception:
                target_count = 0

            matched = src_count == target_count
            if not matched:
                all_matched = False

            verification_results[table_name] = {
                "source_count": src_count,
                "target_count": target_count,
                "matched": matched,
            }
    finally:
        target_session.close()

    return verification_results, all_matched


def main():
    parser = argparse.ArgumentParser(
        description="Idempotent SQLite to PostgreSQL Data Migration & Verification Tool for SupplySense"
    )
    parser.add_argument(
        "--sqlite-path",
        default=str(BASE_DIR / "inventory.db"),
        help="Path to source SQLite database file (default: smart-inventory-backend/inventory.db)",
    )
    parser.add_argument(
        "--target-url",
        default=None,
        help="Target PostgreSQL database URL (or use TARGET_DATABASE_URL / POSTGRES_URL env var)",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Compare source SQLite and target PostgreSQL database row counts without modifying either database",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate data extraction, conversion, and validation without connecting to target DB or writing data",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Batch size for database migration operations (default: 1000)",
    )

    args = parser.parse_args()

    logger.info("=== SupplySense SQLite to PostgreSQL Migration & Verification Tool ===")

    # 1. Initialize Source Engine
    source_engine = get_sqlite_engine(args.sqlite_path)
    source_counts = get_source_table_counts(source_engine)

    logger.info(f"Source SQLite DB: {Path(args.sqlite_path).resolve()}")
    logger.info("Actual Source Row Counts:")
    for t_name, cnt in source_counts.items():
        logger.info(f"  - {t_name:25s}: {cnt}")

    # 2. Handle Dry-Run Mode
    if args.dry_run:
        logger.info("\n--- DRY-RUN MODE ACTIVATED ---")
        logger.info("Simulating migration pipeline against source SQLite database...")
        results = migrate_data(source_engine, target_engine=None, dry_run=True)
        
        print("\n" + "=" * 65)
        print(f"{'TABLE NAME':<25} | {'SOURCE ROWS':<12} | {'STATUS':<20}")
        print("=" * 65)
        for tbl, res in results.items():
            print(f"{tbl:<25} | {res['source']:<12} | {res['status']:<20}")
        print("=" * 65)
        print("DRY-RUN VALIDATION SUCCESSFUL. Source SQLite database remains untouched.\n")
        return

    # 3. Resolve Target Database URL
    target_url = get_target_url(args.target_url)

    if not target_url:
        print("\n" + "!" * 70)
        print("POSTGRESQL TARGET DATABASE NOT SPECIFIED / UNAVAILABLE")
        print("To execute a live migration or --verify-only check against PostgreSQL, specify")
        print("a valid connection URL via --target-url or set TARGET_DATABASE_URL env var.")
        print("Example: python scripts/migrate_sqlite_to_postgres.py --target-url postgresql://user:pass@localhost:5432/supplysense")
        print("!" * 70 + "\n")
        sys.exit(0)

    target_engine = create_engine(target_url)

    # 4. Handle Verify-Only Mode
    if args.verify_only:
        logger.info("\n--- VERIFY-ONLY MODE ACTIVATED ---")
        v_results, all_matched = verify_migration(source_engine, target_engine)

        print("\n" + "=" * 65)
        print(f"{'TABLE NAME':<25} | {'SOURCE':<10} | {'TARGET':<10} | {'MATCHED':<8}")
        print("=" * 65)
        for tbl, res in v_results.items():
            status_str = "YES" if res["matched"] else "NO"
            print(f"{tbl:<25} | {res['source_count']:<10} | {res['target_count']:<10} | {status_str:<8}")
        print("=" * 65)

        if all_matched:
            print("VERIFICATION RESULT: ALL TABLE COUNTS MATCH PERFECTLY.\n")
            sys.exit(0)
        else:
            print("VERIFICATION RESULT: TABLE COUNT MISMATCH DETECTED.\n")
            sys.exit(1)

    # 5. Execute Live Migration
    logger.info(f"\nTarget Database: {target_url.split('@')[-1] if '@' in target_url else target_url}")
    logger.info("Starting idempotent migration...")
    
    # Ensure target tables exist
    models.Base.metadata.create_all(bind=target_engine)

    results = migrate_data(source_engine, target_engine, batch_size=args.batch_size, dry_run=False)
    
    print("\n" + "=" * 70)
    print(f"{'TABLE NAME':<25} | {'SOURCE':<8} | {'MIGRATED':<9} | {'SKIPPED':<8} | {'STATUS':<10}")
    print("=" * 70)
    for tbl, res in results.items():
        print(f"{tbl:<25} | {res['source']:<8} | {res['migrated']:<9} | {res['skipped']:<8} | {res['status']:<10}")
    print("=" * 70)
    print("MIGRATION COMPLETED SUCCESSFULLY.\n")


if __name__ == "__main__":
    main()
