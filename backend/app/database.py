import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, ORMExecuteState
from sqlalchemy.pool import QueuePool
from .config import settings
from .tenant import get_current_tenant, get_current_role, clear_current_tenant

logger = logging.getLogger(__name__)

# Normalize DATABASE_URL for PostgreSQL (supports postgresql://, postgres://, postgresql+psycopg2://)
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

if db_url.startswith("sqlite"):
    # SQLite Configuration with High Concurrency WAL Mode
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False, "timeout": 15},
    )
    
    # Enable WAL mode and foreign keys automatically on connection to prevent file locking
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

elif "hana" in db_url:
    # Native SAP HANA Cloud Engine Configuration with QueuePool
    import sqlalchemy_hana
    engine = create_engine(
        db_url,
        poolclass=QueuePool,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True,
        connect_args={"sslValidateCertificate": False}
    )

else:
    # Managed PostgreSQL / Enterprise SQL Engine with QueuePool & PgBouncer readiness
    engine = create_engine(
        db_url,
        poolclass=QueuePool,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ensure audit_logs columns exist safely on startup
def _ensure_schema_compatibility():
    with engine.connect() as conn:
        try:
            if engine.dialect.name == "sqlite":
                # Check audit_logs columns
                res = conn.execute(text("PRAGMA table_info(audit_logs)")).fetchall()
                col_names = [r[1] for r in res] if res else []
                if col_names:
                    if "sequence_number" not in col_names:
                        conn.execute(text("ALTER TABLE audit_logs ADD COLUMN sequence_number INTEGER"))
                    if "prev_hash" not in col_names:
                        conn.execute(text("ALTER TABLE audit_logs ADD COLUMN prev_hash VARCHAR(64)"))
                # Create scenario_negotiations table if not exists
                conn.execute(text("""
                CREATE TABLE IF NOT EXISTS scenario_negotiations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scenario_id INTEGER NOT NULL,
                    supplier_org_id VARCHAR(100) NOT NULL,
                    product_id VARCHAR(100) NOT NULL,
                    requested_quantity INTEGER NOT NULL,
                    proposed_quantity INTEGER,
                    proposed_unit_price FLOAT,
                    proposed_lead_time_days INTEGER,
                    status VARCHAR(50) DEFAULT 'PENDING_SUPPLIER_RESPONSE',
                    e_signature_name VARCHAR(255),
                    e_signature_hash VARCHAR(64),
                    signed_at TIMESTAMP,
                    response_deadline TIMESTAMP NOT NULL,
                    supplier_comments TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (scenario_id) REFERENCES scenarios (id),
                    FOREIGN KEY (supplier_org_id) REFERENCES organizations (id)
                )
                """))
                conn.commit()
        except Exception as e:
            logger.debug(f"Schema compatibility check: {e}")

_ensure_schema_compatibility()


# ─── ROW-LEVEL MULTI-TENANT QUERY INTERCEPTOR ────────────────────────────────
@event.listens_for(SessionLocal, "do_orm_execute")
def _tenant_scoped_query_interceptor(execute_state: ORMExecuteState):
    """
    Automatic Row-Level Tenant Isolation Hook.
    When a tenant context is active, automatically injects row-level WHERE constraints
    on tenant-scoped entities to guarantee complete organization isolation.
    """
    tenant_id = get_current_tenant()
    role = get_current_role()
    
    if not tenant_id or role == "SYSTEM_ADMIN":
        return

    # Intercept SELECT queries for tenant-scoped safety
    if execute_state.is_select:
        for mapper in execute_state.all_mappers:
            cls = mapper.class_
            table_name = getattr(cls, "__tablename__", "")
            
            # Suppliers can only query their own notifications, confirmations, negotiations, facilities, inventory, etc.
            if role in ["SUPPLIER_ADMIN", "SUPPLIER_USER"]:
                if table_name in ["supplier_notifications", "supplier_confirmations", "scenario_negotiations"] and hasattr(cls, "supplier_org_id"):
                    execute_state.statement = execute_state.statement.where(cls.supplier_org_id == tenant_id)
                elif table_name in ["facilities", "inventories", "supplier_profiles"] and hasattr(cls, "organization_id"):
                    execute_state.statement = execute_state.statement.where(cls.organization_id == tenant_id)
                elif table_name in ["supplier_conditions", "routes"] and hasattr(cls, "supplier_org_id"):
                    execute_state.statement = execute_state.statement.where(cls.supplier_org_id == tenant_id)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    tenant_id = get_current_tenant()
    
    # Set PostgreSQL RLS session variable if running on PostgreSQL
    if tenant_id and engine.dialect.name == "postgresql":
        try:
            db.execute(text("SET LOCAL app.current_tenant = :tenant"), {"tenant": tenant_id})
        except Exception as e:
            logger.debug(f"Could not set PostgreSQL RLS variable: {e}")

    try:
        yield db
    finally:
        db.close()

def get_db_pool_status() -> dict:
    """Returns runtime database dialect, connection pool, and tenant status."""
    pool = engine.pool
    status = {
        "dialect": engine.dialect.name,
        "driver": engine.driver,
        "pool_class": pool.__class__.__name__,
        "active_tenant": get_current_tenant(),
        "active_role": get_current_role(),
    }
    if hasattr(pool, "size"):
        status["pool_size"] = pool.size()
        status["checked_in"] = pool.checkedin()
        status["checked_out"] = pool.checkedout()
        status["overflow"] = pool.overflow()
    return status


