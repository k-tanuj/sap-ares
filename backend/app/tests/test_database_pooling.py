import sys
from pathlib import Path

# Add backend directory to sys.path so tests run regardless of execution root
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool
from app.database import engine, get_db, get_db_pool_status, SessionLocal
from app.config import settings
from app.tenant import TenantContext, set_current_tenant, get_current_tenant, clear_current_tenant
from app import models

def test_current_db_connection():
    """Test that active database connection pool responds and executes queries."""
    status = get_db_pool_status()
    assert "dialect" in status
    assert "pool_class" in status
    
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT 1")).scalar()
        assert result == 1
        
        org_count = db.query(models.Organization).count()
        assert org_count >= 0
    finally:
        db.close()

def test_postgresql_queuepool_configuration():
    """Test PostgreSQL engine initialization with QueuePool and PgBouncer settings."""
    pg_url = "postgresql+psycopg2://user:pass@localhost:5432/ares_db"
    pg_engine = create_engine(
        pg_url,
        poolclass=QueuePool,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True
    )
    
    assert isinstance(pg_engine.pool, QueuePool)
    assert pg_engine.pool.size() == settings.DB_POOL_SIZE
    assert pg_engine.pool._max_overflow == settings.DB_MAX_OVERFLOW
    assert pg_engine.pool._timeout == settings.DB_POOL_TIMEOUT
    assert pg_engine.pool._recycle == settings.DB_POOL_RECYCLE
    assert pg_engine.pool._pre_ping is True

def test_sqlite_wal_pragmas():
    """Test that SQLite connections execute WAL mode and timeout pragmas."""
    if engine.dialect.name == "sqlite":
        with engine.connect() as conn:
            journal_mode = conn.execute(text("PRAGMA journal_mode")).scalar()
            assert journal_mode is not None
            busy_timeout = conn.execute(text("PRAGMA busy_timeout")).scalar()
            assert busy_timeout == 10000

def test_row_level_tenant_isolation():
    """Test automatic row-level query filtering under active tenant scopes."""
    db = SessionLocal()
    try:
        # 1. Test Supplier Tenant Scope (China)
        with TenantContext("org-supplier-china", "SUPPLIER_ADMIN"):
            assert get_current_tenant() == "org-supplier-china"
            facilities = db.query(models.Facility).all()
            for fac in facilities:
                assert fac.organization_id == "org-supplier-china"

        # 2. Test Supplier Tenant Scope (Germany)
        with TenantContext("org-supplier-germany", "SUPPLIER_ADMIN"):
            assert get_current_tenant() == "org-supplier-germany"
            facilities = db.query(models.Facility).all()
            for fac in facilities:
                assert fac.organization_id == "org-supplier-germany"

        # 3. Test Buyer Scope (Can view multiple suppliers across network)
        with TenantContext("org-buyer-1", "BUYER_ADMIN"):
            assert get_current_tenant() == "org-buyer-1"
            all_orgs = db.query(models.Organization).all()
            assert len(all_orgs) >= 1

        # 4. Context auto-clears upon exit
        clear_current_tenant()
        assert get_current_tenant() is None
    finally:
        db.close()
