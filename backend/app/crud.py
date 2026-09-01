from sqlalchemy.orm import Session
from . import models, schemas, auth
import datetime
from typing import List, Optional

# Audit Log Helper
def log_action(db: Session, action: str, entity_type: str, entity_id: str, description: str, user_id: Optional[int] = None, email: Optional[str] = None):
    audit_entry = models.AuditLog(
        user_id=user_id,
        email=email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        description=description,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry

# Organizations
def get_organization(db: Session, org_id: str):
    return db.query(models.Organization).filter(models.Organization.id == org_id).first()

def get_organizations(db: Session, org_type: Optional[str] = None):
    query = db.query(models.Organization)
    if org_type:
        query = query.filter(models.Organization.type == org_type)
    return query.all()

def create_organization(db: Session, org: schemas.OrganizationCreate):
    db_org = models.Organization(
        id=org.id,
        name=org.name,
        type=org.type,
        onboarding_status=org.onboarding_status
    )
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

def update_organization_status(db: Session, org_id: str, status: str, auditor_email: str, auditor_id: int):
    db_org = get_organization(db, org_id)
    if db_org:
        old_status = db_org.onboarding_status
        db_org.onboarding_status = status
        db.commit()
        db.refresh(db_org)
        log_action(
            db,
            action="SUPPLIER_ONBOARDING_STATUS_CHANGE",
            entity_type="Organization",
            entity_id=org_id,
            description=f"Status changed from {old_status} to {status}",
            user_id=auditor_id,
            email=auditor_email
        )
    return db_org

# Users
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pw = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_pw,
        role=user.role,
        organization_id=user.organization_id,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Supplier Profiles
def get_supplier_profile(db: Session, org_id: str):
    return db.query(models.SupplierProfile).filter(models.SupplierProfile.organization_id == org_id).first()

def create_supplier_profile(db: Session, profile: schemas.SupplierProfileCreate):
    db_profile = models.SupplierProfile(**profile.model_dump())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

def update_supplier_profile(db: Session, org_id: str, profile_update: schemas.SupplierProfileBase):
    db_profile = get_supplier_profile(db, org_id)
    if not db_profile:
        db_profile = models.SupplierProfile(organization_id=org_id)
        db.add(db_profile)
    
    update_data = profile_update.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(db_profile, key, val)
    
    db.commit()
    db.refresh(db_profile)
    return db_profile

# Facilities
def get_facilities(db: Session, org_id: Optional[str] = None):
    query = db.query(models.Facility)
    if org_id:
        query = query.filter(models.Facility.organization_id == org_id)
    return query.all()

def create_facility(db: Session, facility: schemas.FacilityCreate):
    db_fac = models.Facility(**facility.model_dump())
    db.add(db_fac)
    db.commit()
    db.refresh(db_fac)
    return db_fac

# Products
def get_product(db: Session, product_id: str):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_products(db: Session):
    return db.query(models.Product).all()

def create_product(db: Session, product: schemas.ProductCreate):
    db_prod = models.Product(**product.model_dump())
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    return db_prod

# Inventory
def get_inventory(db: Session, org_id: Optional[str] = None):
    query = db.query(models.Inventory)
    if org_id:
        query = query.filter(models.Inventory.organization_id == org_id)
    return query.all()

def create_inventory(db: Session, inv: schemas.InventoryCreate):
    db_inv = models.Inventory(**inv.model_dump())
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    return db_inv

# Supplier Conditions
def get_supplier_conditions(db: Session, supplier_org_id: Optional[str] = None):
    query = db.query(models.SupplierCondition)
    if supplier_org_id:
        query = query.filter(models.SupplierCondition.supplier_org_id == supplier_org_id)
    return query.all()

def create_supplier_condition(db: Session, cond: schemas.SupplierConditionCreate):
    db_cond = models.SupplierCondition(**cond.model_dump())
    db.add(db_cond)
    db.commit()
    db.refresh(db_cond)
    return db_cond

# Routes
def get_routes(db: Session, active_only: bool = True):
    query = db.query(models.Route)
    if active_only:
        query = query.filter(models.Route.active == True)
    return query.all()

def create_route(db: Session, route: schemas.RouteCreate):
    db_route = models.Route(**route.model_dump())
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route

# Tariff Events
def get_tariff_event(db: Session, event_id: int):
    return db.query(models.TariffEvent).filter(models.TariffEvent.id == event_id).first()

def get_tariff_events(db: Session):
    return db.query(models.TariffEvent).all()

def create_tariff_event(db: Session, event: schemas.TariffEventCreate):
    db_event = models.TariffEvent(
        title=event.title,
        source_country=event.source_country,
        destination_country=event.destination_country,
        affected_hscode_categories=event.affected_hscode_categories,
        tariff_rate_increase=event.tariff_rate_increase,
        effective_date=event.effective_date,
        status="DETECTED"
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    # Audit log
    log_action(
        db,
        action="TARIFF_EVENT_DETECTED",
        entity_type="TariffEvent",
        entity_id=db_event.id,
        description=f"New tariff event from {event.source_country} to {event.destination_country} detected."
    )
    return db_event

def update_tariff_event_status(db: Session, event_id: int, status: str, auditor_email: str, auditor_id: int):
    db_event = get_tariff_event(db, event_id)
    if db_event:
        old_status = db_event.status
        db_event.status = status
        db.commit()
        db.refresh(db_event)
        
        # Log action
        log_action(
            db,
            action="TARIFF_EVENT_STATUS_CHANGE",
            entity_type="TariffEvent",
            entity_id=event_id,
            description=f"Tariff status changed from {old_status} to {status}",
            user_id=auditor_id,
            email=auditor_email
        )
    return db_event

# Supplier Confirmation
def get_confirmations(db: Session, tariff_event_id: Optional[int] = None, supplier_org_id: Optional[str] = None):
    query = db.query(models.SupplierConfirmation)
    if tariff_event_id:
        query = query.filter(models.SupplierConfirmation.tariff_event_id == tariff_event_id)
    if supplier_org_id:
        query = query.filter(models.SupplierConfirmation.supplier_org_id == supplier_org_id)
    return query.all()

def create_supplier_confirmation(db: Session, conf: schemas.SupplierConfirmationCreate):
    db_conf = models.SupplierConfirmation(**conf.model_dump())
    db.add(db_conf)
    db.commit()
    db.refresh(db_conf)
    return db_conf

def update_supplier_confirmation(db: Session, conf_id: int, conf_update: schemas.SupplierConfirmationUpdate, user_email: str, user_id: int):
    db_conf = db.query(models.SupplierConfirmation).filter(models.SupplierConfirmation.id == conf_id).first()
    if db_conf:
        old_status = db_conf.status
        db_conf.status = conf_update.status
        if conf_update.supplier_notes is not None:
            db_conf.supplier_notes = conf_update.supplier_notes
        db_conf.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(db_conf)
        
        # Log action
        log_action(
            db,
            action="SUPPLIER_CONFIRMATION_UPDATED",
            entity_type="SupplierConfirmation",
            entity_id=conf_id,
            description=f"Status changed from {old_status} to {conf_update.status}. Notes: {conf_update.supplier_notes}",
            user_id=user_id,
            email=user_email
        )
    return db_conf

# Scenarios
def get_scenarios(db: Session, tariff_event_id: Optional[int] = None):
    query = db.query(models.Scenario)
    if tariff_event_id is not None:
        query = query.filter(models.Scenario.tariff_event_id == tariff_event_id)
    return query.all()

def get_scenario(db: Session, scenario_id: int):
    return db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()

def create_scenario(db: Session, scenario: schemas.ScenarioCreate, created_by: int):
    db_scen = models.Scenario(
        tariff_event_id=scenario.tariff_event_id,
        name=scenario.name,
        objective=scenario.objective,
        action_details=[act.model_dump() for act in scenario.action_details],
        status="PENDING_REVIEW",
        feasibility="FEASIBLE", # Default to feasible, validation engine will update
        optimized_cost=0.0,
        recovery_time_days=0,
        risk_score=0.0,
        continuity_percentage=100.0,
        created_by=created_by
    )
    db.add(db_scen)
    db.commit()
    db.refresh(db_scen)
    return db_scen

def update_scenario_metrics(db: Session, scenario_id: int, feasibility: str, feasibility_notes: str, cost: float, time_days: int, risk: float, continuity: float):
    db_scen = get_scenario(db, scenario_id)
    if db_scen:
        db_scen.feasibility = feasibility
        db_scen.feasibility_notes = feasibility_notes
        db_scen.optimized_cost = cost
        db_scen.recovery_time_days = time_days
        db_scen.risk_score = risk
        db_scen.continuity_percentage = continuity
        db.commit()
        db.refresh(db_scen)
    return db_scen

def update_scenario_status(db: Session, scenario_id: int, status: str, auditor_email: str, auditor_id: int):
    db_scen = get_scenario(db, scenario_id)
    if db_scen:
        old_status = db_scen.status
        db_scen.status = status
        db.commit()
        db.refresh(db_scen)
        
        # Log action
        log_action(
            db,
            action="SCENARIO_STATUS_CHANGE",
            entity_type="Scenario",
            entity_id=scenario_id,
            description=f"Scenario status changed from {old_status} to {status}",
            user_id=auditor_id,
            email=auditor_email
        )
    return db_scen

# Simulations
def get_simulation_results(db: Session, scenario_id: Optional[int] = None):
    query = db.query(models.SimulationResult)
    if scenario_id:
        query = query.filter(models.SimulationResult.scenario_id == scenario_id)
    return query.all()

def create_simulation_result(db: Session, scenario_id: int, before_kpi: dict, after_kpi: dict):
    db_sim = models.SimulationResult(
        scenario_id=scenario_id,
        before_kpi=before_kpi,
        after_kpi=after_kpi
    )
    db.add(db_sim)
    db.commit()
    db.refresh(db_sim)
    return db_sim

# Audit Logs
def get_audit_logs(db: Session):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).all()
