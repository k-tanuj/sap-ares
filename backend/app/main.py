from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import datetime

from .database import engine, Base, get_db
from .config import settings
from . import models, auth, schemas, crud
from .routers import auth as auth_router, suppliers as suppliers_router, tariffs as tariffs_router, scenarios as scenarios_router, sap as sap_router, trade as trade_router, analytics as analytics_router
import subprocess

# Safe database schema initialization
try:
    import os
    if os.path.exists("alembic.ini") and "sqlite" in settings.DATABASE_URL:
        import sys
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=False)
except Exception as e:
    print(f"Migration notice: {e}")

app = FastAPI(title="ARES — Autonomous Resilience & Enterprise Supply Chain", version="4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include Routers
app.include_router(auth_router.router)
app.include_router(suppliers_router.router)
app.include_router(tariffs_router.router)
app.include_router(scenarios_router.router)
app.include_router(sap_router.router)
app.include_router(trade_router.router)
app.include_router(analytics_router.router)

@app.get("/api/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Fetch system audit logs. Buyer only.
    """
    return crud.get_audit_logs(db)

@app.post("/api/system/seed", status_code=200)
def trigger_seed_db(db: Session = Depends(get_db)):
    """
    Endpoint to manually re-seed database with fresh demo data.
    """
    seed_database(db)
    return {"status": "SUCCESS", "message": "Database seeded successfully"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}


def seed_database(db: Session):
    """
    Deterministic realistic seed data for ARES Demo Story.
    """
    # Clear existing tables (optional, but keep it safe for demo restarts)
    # Check if seeded first
    if db.query(models.Organization).first():
        logger_name = "app.main"
        import logging
        logging.getLogger(logger_name).info("Database already seeded. Skipping.")
        return

    # 1. Buyer Org
    buyer_org = models.Organization(id="org-buyer-1", name="ARES Enterprise", type="BUYER", onboarding_status="ACTIVE")
    db.add(buyer_org)

    # 2. 8 Suppliers (as requested by Demo Data specifications)
    suppliers = [
        models.Organization(id="org-supplier-china", name="SinoChip Technologies Ltd.", type="SUPPLIER", onboarding_status="APPROVED"),
        models.Organization(id="org-supplier-germany", name="Bavarian Microelectronics GmbH", type="SUPPLIER", onboarding_status="APPROVED"),
        models.Organization(id="org-supplier-vietnam", name="Mekong Sourcing Ltd", type="SUPPLIER", onboarding_status="PENDING_VERIFICATION"),
        models.Organization(id="org-supplier-japan", name="Tokyo Optoelectronics Corp", type="SUPPLIER", onboarding_status="ACTIVE"),
        models.Organization(id="org-supplier-korea", name="Seoul Semiconductors", type="SUPPLIER", onboarding_status="UNDER_REVIEW"),
        models.Organization(id="org-supplier-taiwan", name="Taipei Foundry Group", type="SUPPLIER", onboarding_status="ACTIVE"),
        models.Organization(id="org-supplier-belgium", name="Eurocircuits NV", type="SUPPLIER", onboarding_status="APPROVED"),
        models.Organization(id="org-supplier-usa", name="Apex Logistics & Assembly", type="SUPPLIER", onboarding_status="REGISTERED"),
    ]
    for s in suppliers:
        db.add(s)
        
    db.commit()

    # 3. Create Users
    # Password: password
    hashed_pw = auth.get_password_hash("password")
    
    users = [
        models.User(email="buyer@ares.com", hashed_password=hashed_pw, role="BUYER_ADMIN", organization_id="org-buyer-1"),
        models.User(email="china@sino.com", hashed_password=hashed_pw, role="SUPPLIER_ADMIN", organization_id="org-supplier-china"),
        models.User(email="germany@bavarian.com", hashed_password=hashed_pw, role="SUPPLIER_ADMIN", organization_id="org-supplier-germany"),
        models.User(email="vietnam@mekong.com", hashed_password=hashed_pw, role="SUPPLIER_ADMIN", organization_id="org-supplier-vietnam"),
    ]
    for u in users:
        db.add(u)
    db.commit()

    # 4. Supplier Profiles
    profiles = [
        models.SupplierProfile(organization_id="org-supplier-china", address="Building 4, Science Park, Shenzhen", country="China", contact_name="Jack Ma", contact_email="contact@sinochip.cn", certifications="ISO-9001, RoHS", production_restrictions="High season capacity tight"),
        models.SupplierProfile(organization_id="org-supplier-germany", address="Industrial Ring 12, Munich", country="Germany", contact_name="Hans Schmidt", contact_email="hans@bavarianmicro.de", certifications="ISO-9001, AS9100, Cleanroom Class 5", production_restrictions="None"),
        models.SupplierProfile(organization_id="org-supplier-vietnam", address="Dist 9, Hi-Tech Park, HCMC", country="Vietnam", contact_name="Nguyen Van A", contact_email="sales@mekong.vn", certifications="ISO-14001", production_restrictions="Sourcing component bottlenecks"),
    ]
    for p in profiles:
        db.add(p)

    # 5. Products / Components
    products = [
        models.Product(id="MAT-001", name="Microcontroller Chip X2", sku="MCU-X2-32BIT", description="Core automotive & industrial grade 32-bit MCU.", unit_cost=50.0, lead_time_days=14, min_order_qty=1000),
        models.Product(id="MAT-002", name="Automotive Sensor Array S1", sku="SEN-S1-AUTO", description="Radar and lidar sensor fusion array.", unit_cost=80.0, lead_time_days=21, min_order_qty=500),
        models.Product(id="MAT-003", name="Copper Cable Harness H5", sku="HAR-H5-COP", description="High voltage copper wiring harness.", unit_cost=15.0, lead_time_days=7, min_order_qty=2000),
    ]
    for prod in products:
        db.add(prod)
    db.commit()

    # 6. Supplier Conditions
    conditions = [
        # China Supplies MAT-001 (Microchip) cheaper but affected by geopolitical tariffs
        models.SupplierCondition(supplier_org_id="org-supplier-china", product_id="MAT-001", base_price=45.0, lead_time_days=10, moq=1000, capacity_per_week=5000),
        # Germany Supplies MAT-001 more expensive, unaffected
        models.SupplierCondition(supplier_org_id="org-supplier-germany", product_id="MAT-001", base_price=55.0, lead_time_days=5, moq=500, capacity_per_week=3000),
        
        # China supplies Sensor MAT-002
        models.SupplierCondition(supplier_org_id="org-supplier-china", product_id="MAT-002", base_price=75.0, lead_time_days=15, moq=500, capacity_per_week=2000),
    ]
    for cond in conditions:
        db.add(cond)

    # 7. Routes
    routes = [
        models.Route(id="RT-OCEAN-CN-DE", origin="China", destination="Germany", mode="OCEAN", lead_time_days=28, cost_per_unit=2.0, capacity_limit=10000, active=True),
        models.Route(id="RT-AIR-CN-DE", origin="China", destination="Germany", mode="AIR", lead_time_days=5, cost_per_unit=10.0, capacity_limit=2000, active=True),
        models.Route(id="RT-ROAD-DE-DE", origin="Germany", destination="Germany", mode="ROAD", lead_time_days=2, cost_per_unit=1.0, capacity_limit=5000, active=True),
    ]
    for r in routes:
        db.add(r)

    # 8. Inventory
    inventories = [
        # Buyer stock at Munich plant
        models.Inventory(organization_id="org-buyer-1", product_id="MAT-001", quantity=3000, safety_stock=5000), # safety stock deficit!
        # China supplier stock
        models.Inventory(organization_id="org-supplier-china", product_id="MAT-001", quantity=8000, safety_stock=2000, allocation_limit=5000),
        # Germany supplier stock
        models.Inventory(organization_id="org-supplier-germany", product_id="MAT-001", quantity=4000, safety_stock=1000, allocation_limit=3000),
    ]
    for inv in inventories:
        db.add(inv)
    db.commit()

    # 9. Tariff Events
    tariff_event = models.TariffEvent(
        title="US-China Electronics Tariff Increase",
        source_country="China",
        destination_country="Germany",
        affected_hscode_categories="Microcontroller, MCU, Semiconductor",
        tariff_rate_increase=0.25, # 25% tariff increase
        effective_date=datetime.datetime.utcnow() + datetime.timedelta(days=10),
        status="CONFIRMED",
        source_agency="MANUAL",
        reference_id=None,
    )
    db.add(tariff_event)

    india_tariff = models.TariffEvent(
        title="CBIC Notification 23/2026: Anti-dumping duty on electronic ICs from China",
        source_country="China",
        destination_country="India",
        affected_hscode_categories="semiconductors, integrated circuits, microcontroller",
        tariff_rate_increase=0.18,
        effective_date=datetime.datetime.utcnow() + datetime.timedelta(days=15),
        status="DETECTED",
        source_agency="CBIC",
        reference_id="CBIC-NOTIF-23-2026",
    )
    db.add(india_tariff)
    db.commit()

    # 10. Supplier Confirmations (Exposure mapping)
    confirmations = [
        # SinoChip is confirmed affected
        models.SupplierConfirmation(
            tariff_event_id=tariff_event.id,
            supplier_org_id="org-supplier-china",
            status="CONFIRMED_AFFECTED",
            supplier_notes="Tariff affects all MCU shipments originating from our Shenzhen facility. We expect 25% cost rise on base price."
        ),
        # Bavarian Microelectronics is unaffected (denies exposure)
        models.SupplierConfirmation(
            tariff_event_id=tariff_event.id,
            supplier_org_id="org-supplier-germany",
            status="NOT_AFFECTED",
            supplier_notes="The tariff does not materially affect us. Our cleanrooms and silicon wafer sourcing are entirely within EU boundaries."
        )
    ]
    for c in confirmations:
        db.add(c)
    db.commit()

    # Log initial audits
    crud.log_action(db, "SYSTEM_SEED", "System", "all", "Database successfully seeded with realistic ARES demo story records.")

# Run table creation & seeding on startup
@app.on_event("startup")
def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Table creation notice: {e}")
    db = next(get_db())
    seed_database(db)
