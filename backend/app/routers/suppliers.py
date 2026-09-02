from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas, auth, models
from ..database import get_db

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])

# --- BUYER ENDPOINTS ---

@router.get("", response_model=List[schemas.OrganizationResponse])
def list_suppliers(
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    List all supplier organizations. Accessible only by Buyers.
    """
    return crud.get_organizations(db, org_type="SUPPLIER")

@router.put("/{org_id}/status", response_model=schemas.OrganizationResponse)
def update_supplier_onboarding_status(
    org_id: str,
    payload: schemas.TariffEventUpdateStatus, # Reuse simple status wrapper
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Update onboarding status of a supplier (e.g. APPROVED, ACTIVE, REJECTED, UNDER_REVIEW).
    Accessible only by Buyers. Triggers audit logging.
    """
    org = crud.get_organization(db, org_id)
    if not org or org.type != "SUPPLIER":
        raise HTTPException(status_code=404, detail="Supplier organization not found")
        
    updated_org = crud.update_organization_status(
        db, 
        org_id=org_id, 
        status=payload.status, 
        auditor_email=current_user.email, 
        auditor_id=current_user.id
    )
    return updated_org


# --- SHARED OR SUPPLIER PORTAL ENDPOINTS ---

@router.get("/me", response_model=schemas.OrganizationResponse)
def get_my_organization(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get organization details for the current user.
    """
    org = crud.get_organization(db, current_user.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.get("/profile", response_model=schemas.SupplierProfileResponse)
def get_my_profile(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get profile of current user's supplier organization (or any if buyer).
    """
    org_id = current_user.organization_id
    profile = crud.get_supplier_profile(db, org_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.put("/profile", response_model=schemas.SupplierProfileResponse)
def update_my_profile(
    payload: schemas.SupplierProfileBase,
    current_user: models.User = Depends(auth.require_supplier),
    db: Session = Depends(get_db)
):
    """
    Update profile of current user's supplier organization.
    """
    return crud.update_supplier_profile(db, current_user.organization_id, payload)

@router.get("/dashboard-summary")
def get_supplier_dashboard_summary(
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Get dynamic summary for supplier dashboard.
    """
    return crud.get_supplier_dashboard_summary(db, org.id)

# --- OPERATIONAL DATA ENDPOINTS (Restricted to ACTIVE/APPROVED status) ---

@router.get("/facilities", response_model=List[schemas.FacilityResponse])
def get_supplier_facilities(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get facilities. Suppliers can only see their own facilities.
    Buyers can see all facilities.
    """
    if current_user.role in ["BUYER_ADMIN", "BUYER_USER"]:
        return crud.get_facilities(db)
    
    # Verify supplier is approved/active
    auth.get_supplier_org(current_user, db)
    return crud.get_facilities(db, org_id=current_user.organization_id)

@router.post("/facilities", response_model=schemas.FacilityResponse)
def create_supplier_facility(
    payload: schemas.FacilityBase,
    current_user: models.User = Depends(auth.require_supplier),
    db: Session = Depends(get_db)
):
    """
    Create a new facility for supplier organization.
    """
    # Enforce status check
    auth.get_supplier_org(current_user, db)
    
    # Form payload
    fac_schema = schemas.FacilityCreate(
        **payload.model_dump(),
        organization_id=current_user.organization_id
    )
    return crud.create_facility(db, fac_schema)

@router.put("/facilities/{facility_id}", response_model=schemas.FacilityResponse)
def update_supplier_facility(
    facility_id: str,
    payload: schemas.FacilityUpdate,
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Update an existing facility.
    """
    fac = crud.update_facility(db, facility_id, org.id, payload)
    if not fac:
        raise HTTPException(status_code=404, detail="Facility not found or not owned by supplier")
    return fac

@router.delete("/facilities/{facility_id}")
def delete_supplier_facility(
    facility_id: str,
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Delete an existing facility.
    """
    success = crud.delete_facility(db, facility_id, org.id)
    if not success:
        raise HTTPException(status_code=404, detail="Facility not found or not owned by supplier")
    return {"status": "success"}

@router.get("/conditions", response_model=List[schemas.SupplierConditionResponse])
def get_supplier_conditions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get supplier operational pricing/lead-time conditions.
    Suppliers only see their own. Buyers see all.
    """
    if current_user.role in ["BUYER_ADMIN", "BUYER_USER"]:
        return crud.get_supplier_conditions(db)
        
    auth.get_supplier_org(current_user, db)
    return crud.get_supplier_conditions(db, supplier_org_id=current_user.organization_id)

@router.post("/conditions", response_model=schemas.SupplierConditionResponse)
def create_supplier_condition(
    payload: schemas.SupplierConditionBase,
    current_user: models.User = Depends(auth.require_supplier),
    db: Session = Depends(get_db)
):
    """
    Create or add operational pricing/lead-time condition for a component.
    """
    auth.get_supplier_org(current_user, db)
    cond_schema = schemas.SupplierConditionCreate(
        **payload.model_dump(),
        supplier_org_id=current_user.organization_id
    )
    return crud.create_supplier_condition(db, cond_schema)

@router.put("/conditions/{condition_id}", response_model=schemas.SupplierConditionResponse)
def update_supplier_condition(
    condition_id: int,
    payload: schemas.SupplierConditionUpdate,
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Update a condition.
    """
    cond = crud.update_supplier_condition(db, condition_id, org.id, payload)
    if not cond:
        raise HTTPException(status_code=404, detail="Condition not found")
    return cond

@router.get("/inventory", response_model=List[schemas.InventoryResponse])
def get_supplier_inventory(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get inventory. Suppliers only see their own stock. Buyers see all.
    """
    if current_user.role in ["BUYER_ADMIN", "BUYER_USER"]:
        return crud.get_inventory(db)
        
    auth.get_supplier_org(current_user, db)
    return crud.get_inventory(db, org_id=current_user.organization_id)

@router.post("/inventory", response_model=schemas.InventoryResponse)
def create_supplier_inventory(
    payload: schemas.InventoryBase,
    current_user: models.User = Depends(auth.require_supplier),
    db: Session = Depends(get_db)
):
    """
    Add inventory stock item.
    """
    auth.get_supplier_org(current_user, db)
    inv_schema = schemas.InventoryCreate(
        **payload.model_dump(),
        organization_id=current_user.organization_id
    )
    return crud.create_inventory(db, inv_schema)

@router.put("/inventory/{inventory_id}", response_model=schemas.InventoryResponse)
def update_supplier_inventory(
    inventory_id: int,
    payload: schemas.InventoryUpdate,
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Update inventory stock.
    """
    inv = crud.update_inventory(db, inventory_id, org.id, payload)
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory not found")
    return inv

@router.get("/products", response_model=List[schemas.ProductResponse])
def get_supplier_products(
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Get all products that this supplier provides (via SupplierCondition).
    """
    conditions = crud.get_supplier_conditions(db, supplier_org_id=org.id)
    # Extract unique products
    product_ids = set([c.product_id for c in conditions])
    products = [crud.get_product(db, pid) for pid in product_ids]
    return [p for p in products if p]


# --- MOCKED SECONDARY ENDPOINTS FOR PORTAL COMPLETENESS ---

@router.get("/shipments")
def get_supplier_shipments(
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Get logistics shipments. Currently not implemented for prototype.
    """
    return []

@router.get("/disruptions")
def get_supplier_disruptions(
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Get logged disruption incidents.
    """
    return []

@router.get("/documents")
def get_supplier_documents(
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Get supplier uploaded documents. Currently not implemented for prototype.
    """
    return []

@router.get("/routes", response_model=List[schemas.RouteResponse])
def get_sourcing_routes(
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Get routes specific to the supplier.
    """
    return crud.get_routes(db, active_only=True, supplier_org_id=org.id)

@router.post("/routes", response_model=schemas.RouteResponse)
def create_supplier_route(
    payload: schemas.RouteCreate,
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Create a new route for the supplier organization.
    """
    route_schema = schemas.RouteCreate(
        **payload.model_dump(),
        supplier_org_id=org.id
    )
    return crud.create_route(db, route_schema)


# --- NOTIFICATIONS ENDPOINTS ---

@router.get("/notifications", response_model=List[schemas.SupplierNotificationResponse])
def get_my_notifications(
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Get all notifications for the authenticated supplier.
    """
    return crud.get_supplier_notifications(db, org.id)

@router.put("/notifications/{notification_id}/read", response_model=schemas.SupplierNotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Mark a notification as read.
    """
    notif = crud.mark_notification_read(db, notification_id, org.id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif

@router.get("/notifications/{notification_id}/scenario")
def get_notification_scenario(
    notification_id: int,
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Get the details of the approved scenario associated with a notification,
    filtered to ONLY include actions assigned to the authenticated supplier.
    """
    # 1. Verify notification ownership
    notif = db.query(models.SupplierNotification).filter(
        models.SupplierNotification.id == notification_id,
        models.SupplierNotification.supplier_org_id == org.id
    ).first()
    if not notif or not notif.scenario_id:
        raise HTTPException(status_code=404, detail="Notification or Scenario not found")

    # 2. Get scenario
    scen = crud.get_scenario(db, notif.scenario_id)
    if not scen or scen.status != "APPROVED":
        raise HTTPException(status_code=404, detail="Approved scenario not found")

    # 3. Filter actions to ONLY this supplier
    my_actions = [act for act in scen.action_details if act.get("supplier_org_id") == org.id]

    # Return simplified read-only view
    return {
        "scenario_name": scen.name,
        "objective": scen.objective,
        "disruption_event": scen.tariff_event.title if scen.tariff_event else "Unknown",
        "my_actions": my_actions
    }


# ─── COLLABORATIVE NEGOTIATION & E-SIGNATURE WORKFLOWS ──────────────────────

@router.get("/negotiations", response_model=List[schemas.ScenarioNegotiationResponse])
def get_supplier_negotiations(
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    List all active scenario allocation proposals and negotiation threads for this supplier.
    """
    # Auto-expire overdue negotiations
    crud.expire_overdue_negotiations(db)
    return crud.get_scenario_negotiations(db, supplier_org_id=org.id)

@router.post("/negotiations/{negotiation_id}/counter", response_model=schemas.ScenarioNegotiationResponse)
def counter_propose_negotiation(
    negotiation_id: int,
    payload: schemas.ScenarioNegotiationCounter,
    current_user: models.User = Depends(auth.require_supplier),
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Submit a counter-proposal (e.g. adjust volume to 3,500 due to machine maintenance, rate, lead time).
    """
    neg = crud.submit_supplier_counter_proposal(db, negotiation_id, payload, current_user.email)
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation proposal not found")
    return neg

@router.post("/negotiations/{negotiation_id}/accept", response_model=schemas.ScenarioNegotiationResponse)
def accept_negotiation_with_esignature(
    negotiation_id: int,
    payload: schemas.ScenarioNegotiationAccept,
    current_user: models.User = Depends(auth.require_supplier),
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Accept requested allocation with legally binding cryptographic E-Signature.
    """
    neg = crud.accept_negotiation_with_signature(db, negotiation_id, payload, current_user.email)
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation proposal not found")
    return neg

@router.post("/negotiations/{negotiation_id}/decline", response_model=schemas.ScenarioNegotiationResponse)
def decline_negotiation_proposal(
    negotiation_id: int,
    payload: schemas.ScenarioNegotiationDecline,
    current_user: models.User = Depends(auth.require_supplier),
    org: models.Organization = Depends(auth.get_supplier_org),
    db: Session = Depends(get_db)
):
    """
    Decline requested allocation proposal with reason.
    """
    neg = crud.decline_negotiation(db, negotiation_id, payload, current_user.email)
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation proposal not found")
    return neg

