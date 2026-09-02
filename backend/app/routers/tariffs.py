from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from .. import crud, schemas, auth, models
from ..database import get_db

router = APIRouter(prefix="/api/tariffs", tags=["tariffs"])

@router.get("", response_model=List[schemas.TariffEventResponse])
def get_tariff_events(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all tariff events. Both Buyers and Suppliers can view.
    """
    return crud.get_tariff_events(db)

@router.get("/{event_id}", response_model=schemas.TariffEventResponse)
def get_tariff_event(
    event_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single tariff event by ID.
    """
    event = crud.get_tariff_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Tariff event not found")
    return event

@router.post("", response_model=schemas.TariffEventResponse, status_code=status.HTTP_201_CREATED)
def create_tariff_event(
    payload: schemas.TariffEventCreate,
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Detect / manually enter a tariff event. Accessible only by Buyers.
    Starts in DETECTED status.
    """
    return crud.create_tariff_event(db, payload)

@router.put("/{event_id}/status", response_model=schemas.TariffEventResponse)
def update_tariff_status(
    event_id: int,
    payload: schemas.TariffEventUpdateStatus,
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Human review: Buyer Admin reviews and confirms/rejects the tariff event.
    If CONFIRMED, ARES automatically identifies potentially affected suppliers (based on matching products)
    and creates PENDING confirmations.
    """
    event = crud.get_tariff_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Tariff event not found")
        
    old_status = event.status
    updated_event = crud.update_tariff_event_status(
        db, 
        event_id=event_id, 
        status=payload.status, 
        auditor_email=current_user.email, 
        auditor_id=current_user.id
    )

    # Trigger potential supplier matching only if transitions to CONFIRMED
    if payload.status == "CONFIRMED" and old_status != "CONFIRMED":
        affected_cats = [cat.strip().lower() for cat in event.affected_hscode_categories.split(",")]
        
        # 1. HS Code Matches
        products = db.query(models.Product).filter(models.Product.hs_code.isnot(None)).all()
        affected_prods = [p for p in products if p.hs_code.strip().lower() in affected_cats]
        
        if affected_prods:
            affected_product_ids = [p.id for p in affected_prods]
            conditions = db.query(models.SupplierCondition).filter(
                models.SupplierCondition.product_id.in_(affected_product_ids)
            ).all()
            
            supplier_ids = list(set(c.supplier_org_id for c in conditions))
            
            for supplier_id in supplier_ids:
                # 2. Origin Matches
                has_facility = db.query(models.Facility).filter(
                    models.Facility.organization_id == supplier_id,
                    models.Facility.country.ilike(event.source_country)
                ).first()
                
                has_route_origin = db.query(models.Route).filter(
                    models.Route.supplier_org_id == supplier_id,
                    models.Route.origin.ilike(event.source_country)
                ).first()
                
                if not has_facility and not has_route_origin:
                    continue # No origin match
                    
                # 3. Destination Matches
                has_route_dest = db.query(models.Route).filter(
                    models.Route.supplier_org_id == supplier_id,
                    models.Route.destination.ilike(event.destination_country)
                ).first()
                
                if not has_route_dest:
                    continue # No destination match
                    
                # 4. Buyer Relationship Matches
                has_buyer_rel = db.query(models.BuyerSupplierRelationship).filter(
                    models.BuyerSupplierRelationship.supplier_org_id == supplier_id
                ).first()
                
                if not has_buyer_rel:
                    continue # No buyer relationship
                
                # Check if confirmation already exists
                existing = db.query(models.SupplierConfirmation).filter(
                    models.SupplierConfirmation.tariff_event_id == event_id,
                    models.SupplierConfirmation.supplier_org_id == supplier_id
                ).first()
                
                if not existing:
                    conf_schema = schemas.SupplierConfirmationCreate(
                        tariff_event_id=event_id,
                        supplier_org_id=supplier_id,
                        status="POTENTIALLY_AFFECTED",
                        supplier_notes=f"System identified potential exposure: \n- Origin matches: ✓ {event.source_country}\n- Destination matches: ✓ {event.destination_country}\n- HS code matches: ✓ {event.affected_hscode_categories}\n- Buyer relationship: ✓ Confirmed"
                    )
                    crud.create_supplier_confirmation(db, conf_schema)

    return updated_event

# --- SUPPLIER CONFIRMATIONS ENDPOINTS ---

@router.get("/{event_id}/confirmations", response_model=List[schemas.SupplierConfirmationResponse])
def get_event_confirmations(
    event_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get confirmations for a tariff event. 
    Suppliers can only view their own confirmation. Buyers can view all.
    """
    if current_user.role in ["BUYER_ADMIN", "BUYER_USER"]:
        return crud.get_confirmations(db, tariff_event_id=event_id)
        
    # Supplier restriction
    return crud.get_confirmations(db, tariff_event_id=event_id, supplier_org_id=current_user.organization_id)

@router.get("/confirmations/all", response_model=List[schemas.SupplierConfirmationResponse])
def get_all_confirmations(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all supplier confirmations. Scope is enforced by role.
    """
    if current_user.role in ["BUYER_ADMIN", "BUYER_USER"]:
        return db.query(models.SupplierConfirmation).all()
    return crud.get_confirmations(db, supplier_org_id=current_user.organization_id)

@router.put("/confirmations/{conf_id}", response_model=schemas.SupplierConfirmationResponse)
def update_supplier_exposure(
    conf_id: int,
    payload: schemas.SupplierConfirmationUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a confirmation status (e.g. CONFIRMED_AFFECTED or NOT_AFFECTED) and add notes.
    Suppliers can only update their own records.
    """
    db_conf = db.query(models.SupplierConfirmation).filter(models.SupplierConfirmation.id == conf_id).first()
    if not db_conf:
        raise HTTPException(status_code=404, detail="Confirmation record not found")
        
    # Enforce isolation: Suppliers cannot edit other suppliers' confirmations
    if current_user.role not in ["BUYER_ADMIN", "BUYER_USER"] and db_conf.supplier_org_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Access Denied: You cannot modify another supplier's exposure data.")
        
    return crud.update_supplier_confirmation(db, conf_id, payload, current_user.email, current_user.id)
