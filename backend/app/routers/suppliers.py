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


# --- MOCKED SECONDARY ENDPOINTS FOR PORTAL COMPLETENESS ---

@router.get("/shipments")
def get_supplier_shipments(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get logistics shipments. Returns mock shipments for demo completeness.
    """
    org_id = current_user.organization_id if current_user.role not in ["BUYER_ADMIN", "BUYER_USER"] else "all"
    return [
        {"id": "SH-3001", "origin": "China", "destination": "Germany", "status": "IN_TRANSIT", "carrier": "DHL Global Forwarding", "eta": "2026-09-02", "org_id": "org-supplier-china"},
        {"id": "SH-3002", "origin": "Germany", "destination": "Germany", "status": "DELIVERED", "carrier": "Schenker", "eta": "2026-08-28", "org_id": "org-supplier-germany"}
    ]

@router.get("/disruptions")
def get_supplier_disruptions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get logged disruption incidents.
    """
    return [
        {"id": "DIS-501", "title": "Ocean freight capacity crunch", "severity": "MEDIUM", "status": "ACTIVE"},
        {"id": "DIS-502", "title": "Suez canal delay risk", "severity": "HIGH", "status": "MONITORING"}
    ]

@router.get("/documents")
def get_supplier_documents(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get supplier uploaded documents (e.g. ISO certificates, trade agreements).
    """
    return [
        {"id": "DOC-701", "filename": "iso_9001_certification.pdf", "type": "CERTIFICATE", "uploaded_at": "2026-08-20"},
        {"id": "DOC-702", "filename": "customs_compliance_report_q2.pdf", "type": "COMPLIANCE", "uploaded_at": "2026-08-25"}
    ]

@router.get("/routes", response_model=List[schemas.RouteResponse])
def get_sourcing_routes(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active logistics routes.
    """
    return crud.get_routes(db)

