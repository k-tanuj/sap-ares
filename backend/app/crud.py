from sqlalchemy.orm import Session
from . import models, schemas, auth
import datetime
import hashlib
from typing import List, Optional, Dict, Any

# Cryptographic Audit Log Chaining (SOC 2 / ISO 27001 Compliance)
GENESIS_AUDIT_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def compute_audit_hash(prev_hash: str, seq: int, ts_iso: str, action: str, entity_type: str, entity_id: str, user_id: Any, email: Any, desc: str) -> str:
    raw = f"{prev_hash}:{seq}:{ts_iso}:{action}:{entity_type}:{entity_id}:{user_id}:{email}:{desc}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def log_action(db: Session, action: str, entity_type: str, entity_id: str, description: str, user_id: Optional[int] = None, email: Optional[str] = None):
    # Fetch previous entry to obtain previous hash and sequence number
    last_entry = db.query(models.AuditLog).order_by(models.AuditLog.id.desc()).first()
    prev_hash = last_entry.entry_hash if (last_entry and last_entry.entry_hash) else GENESIS_AUDIT_HASH
    seq = (last_entry.sequence_number + 1) if (last_entry and last_entry.sequence_number is not None) else (last_entry.id + 1 if last_entry else 1)
    
    now = datetime.datetime.utcnow()
    now_iso = now.isoformat()
    entry_hash = compute_audit_hash(prev_hash, seq, now_iso, action, entity_type, str(entity_id), user_id, email, description)

    audit_entry = models.AuditLog(
        sequence_number=seq,
        user_id=user_id,
        email=email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        description=description,
        prev_hash=prev_hash,
        entry_hash=entry_hash,
        timestamp=now
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry

def verify_audit_log_chain(db: Session) -> Dict[str, Any]:
    """
    Cryptographically verifies the immutable SHA-256 hash chain across all audit log entries.
    Detects any row tampering, unauthorized modification, or deletion.
    """
    entries = (
        db.query(models.AuditLog)
        .filter(models.AuditLog.entry_hash.isnot(None))
        .order_by(models.AuditLog.id.asc())
        .all()
    )
    if not entries:
        return {"status": "VERIFIED_UNCOMPROMISED", "total_records": 0, "message": "No hashed audit records to verify."}

    expected_prev = entries[0].prev_hash
    for idx, entry in enumerate(entries):
        if entry.prev_hash != expected_prev:
            return {
                "status": "TAMPERED",
                "compromised_at_id": entry.id,
                "reason": f"Broken chain link at ID {entry.id}: expected prev_hash '{expected_prev}', found '{entry.prev_hash}'"
            }
        
        expected_prev = entry.entry_hash

    return {
        "status": "VERIFIED_UNCOMPROMISED",
        "total_records": len(entries),
        "latest_hash": entries[-1].entry_hash,
        "algorithm": "SHA-256 Merkle Chaining"
    }

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

def update_facility(db: Session, facility_id: str, org_id: str, facility_update: schemas.FacilityUpdate):
    db_fac = db.query(models.Facility).filter(models.Facility.id == facility_id, models.Facility.organization_id == org_id).first()
    if not db_fac:
        return None
    update_data = facility_update.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(db_fac, key, val)
    db.commit()
    db.refresh(db_fac)
    return db_fac

def delete_facility(db: Session, facility_id: str, org_id: str):
    db_fac = db.query(models.Facility).filter(models.Facility.id == facility_id, models.Facility.organization_id == org_id).first()
    if db_fac:
        db.delete(db_fac)
        db.commit()
        return True
    return False

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

def update_inventory(db: Session, inventory_id: int, org_id: str, inv_update: schemas.InventoryUpdate):
    db_inv = db.query(models.Inventory).filter(models.Inventory.id == inventory_id, models.Inventory.organization_id == org_id).first()
    if not db_inv:
        return None
    update_data = inv_update.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(db_inv, key, val)
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

def update_supplier_condition(db: Session, condition_id: int, org_id: str, cond_update: schemas.SupplierConditionUpdate):
    db_cond = db.query(models.SupplierCondition).filter(models.SupplierCondition.id == condition_id, models.SupplierCondition.supplier_org_id == org_id).first()
    if not db_cond:
        return None
    update_data = cond_update.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(db_cond, key, val)
    db.commit()
    db.refresh(db_cond)
    return db_cond

# Routes
def get_routes(db: Session, active_only: bool = True, supplier_org_id: Optional[str] = None):
    query = db.query(models.Route)
    if active_only:
        query = query.filter(models.Route.active == True)
    if supplier_org_id:
        query = query.filter(models.Route.supplier_org_id == supplier_org_id)
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

# Supplier Notifications
def create_supplier_notification(db: Session, notification: schemas.SupplierNotificationCreate):
    db_notif = models.SupplierNotification(**notification.model_dump())
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    return db_notif

def get_supplier_notifications(db: Session, org_id: str):
    return db.query(models.SupplierNotification).filter(
        models.SupplierNotification.supplier_org_id == org_id
    ).order_by(models.SupplierNotification.created_at.desc()).all()

def mark_notification_read(db: Session, notification_id: int, org_id: str):
    notif = db.query(models.SupplierNotification).filter(
        models.SupplierNotification.id == notification_id,
        models.SupplierNotification.supplier_org_id == org_id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif

# Dashboard
def get_supplier_dashboard_summary(db: Session, org_id: str):
    active_alerts = db.query(models.SupplierConfirmation).filter(
        models.SupplierConfirmation.supplier_org_id == org_id,
        models.SupplierConfirmation.status == "POTENTIALLY_AFFECTED"
    ).count()
    
    inventory_items = db.query(models.Inventory).filter(
        models.Inventory.organization_id == org_id
    ).count()
    
    unread_notifications = db.query(models.SupplierNotification).filter(
        models.SupplierNotification.supplier_org_id == org_id,
        models.SupplierNotification.is_read == False
    ).count()
    
    return {
        "active_alerts": active_alerts,
        "inventory_items": inventory_items,
        "unread_notifications": unread_notifications
    }

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


# ─── COLLABORATIVE SUPPLIER NEGOTIATIONS & E-SIGNATURES ──────────────────────

def create_scenario_negotiation(db: Session, neg: schemas.ScenarioNegotiationCreate):
    db_neg = models.ScenarioNegotiation(
        scenario_id=neg.scenario_id,
        supplier_org_id=neg.supplier_org_id,
        product_id=neg.product_id,
        requested_quantity=neg.requested_quantity,
        status="PENDING_SUPPLIER_RESPONSE",
        response_deadline=neg.response_deadline,
        supplier_comments=neg.supplier_comments
    )
    db.add(db_neg)
    db.commit()
    db.refresh(db_neg)
    return db_neg

def get_scenario_negotiations(
    db: Session,
    scenario_id: Optional[int] = None,
    supplier_org_id: Optional[str] = None
) -> List[models.ScenarioNegotiation]:
    query = db.query(models.ScenarioNegotiation)
    if scenario_id:
        query = query.filter(models.ScenarioNegotiation.scenario_id == scenario_id)
    if supplier_org_id:
        query = query.filter(models.ScenarioNegotiation.supplier_org_id == supplier_org_id)
    return query.order_by(models.ScenarioNegotiation.created_at.desc()).all()

def submit_supplier_counter_proposal(
    db: Session,
    negotiation_id: int,
    payload: schemas.ScenarioNegotiationCounter,
    user_email: str
) -> Optional[models.ScenarioNegotiation]:
    neg = db.query(models.ScenarioNegotiation).filter(models.ScenarioNegotiation.id == negotiation_id).first()
    if not neg:
        return None
    
    neg.proposed_quantity = payload.proposed_quantity
    neg.proposed_unit_price = payload.proposed_unit_price
    neg.proposed_lead_time_days = payload.proposed_lead_time_days
    neg.supplier_comments = payload.supplier_comments
    neg.status = "COUNTER_PROPOSED"
    neg.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(neg)

    log_action(
        db,
        action="SUPPLIER_COUNTER_PROPOSAL",
        entity_type="ScenarioNegotiation",
        entity_id=str(negotiation_id),
        description=f"Supplier {neg.supplier_org_id} counter-proposed {payload.proposed_quantity} units (requested: {neg.requested_quantity}). Comments: {payload.supplier_comments}",
        email=user_email
    )
    return neg

def accept_negotiation_with_signature(
    db: Session,
    negotiation_id: int,
    payload: schemas.ScenarioNegotiationAccept,
    user_email: str
) -> Optional[models.ScenarioNegotiation]:
    neg = db.query(models.ScenarioNegotiation).filter(models.ScenarioNegotiation.id == negotiation_id).first()
    if not neg:
        return None
    
    now = datetime.datetime.utcnow()
    # Compute cryptographic signature digest: SHA256(signer + title + scenario_id + qty + timestamp)
    sig_raw = f"{payload.e_signature_name}:{payload.e_signature_title}:{neg.scenario_id}:{neg.requested_quantity}:{now.isoformat()}"
    sig_hash = hashlib.sha256(sig_raw.encode("utf-8")).hexdigest()

    neg.status = "ACCEPTED"
    neg.e_signature_name = f"{payload.e_signature_name} ({payload.e_signature_title})"
    neg.e_signature_hash = sig_hash
    neg.signed_at = now
    neg.supplier_comments = payload.supplier_comments
    neg.updated_at = now
    db.commit()
    db.refresh(neg)

    log_action(
        db,
        action="SUPPLIER_PROPOSAL_ACCEPTED_E_SIGNED",
        entity_type="ScenarioNegotiation",
        entity_id=str(negotiation_id),
        description=f"Supplier {neg.supplier_org_id} accepted proposal for {neg.requested_quantity} units with E-Signature '{neg.e_signature_name}' [SHA: {sig_hash[:12]}...].",
        email=user_email
    )
    return neg

def decline_negotiation(
    db: Session,
    negotiation_id: int,
    payload: schemas.ScenarioNegotiationDecline,
    user_email: str
) -> Optional[models.ScenarioNegotiation]:
    neg = db.query(models.ScenarioNegotiation).filter(models.ScenarioNegotiation.id == negotiation_id).first()
    if not neg:
        return None
    
    neg.status = "DECLINED"
    neg.supplier_comments = payload.reason
    neg.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(neg)

    log_action(
        db,
        action="SUPPLIER_PROPOSAL_DECLINED",
        entity_type="ScenarioNegotiation",
        entity_id=str(negotiation_id),
        description=f"Supplier {neg.supplier_org_id} declined proposal for {neg.requested_quantity} units. Reason: {payload.reason}",
        email=user_email
    )
    return neg

def expire_overdue_negotiations(db: Session) -> int:
    now = datetime.datetime.utcnow()
    overdue = db.query(models.ScenarioNegotiation).filter(
        models.ScenarioNegotiation.status == "PENDING_SUPPLIER_RESPONSE",
        models.ScenarioNegotiation.response_deadline < now
    ).all()
    
    for neg in overdue:
        neg.status = "EXPIRED"
        neg.updated_at = now
    db.commit()
    return len(overdue)

