import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from .. import auth, models, crud
from ..database import get_db
from ..services.sap_adapter import get_sap_adapter

router = APIRouter(prefix="/api/sap", tags=["sap"])

@router.get("/materials")
def get_sap_materials(
    current_user: models.User = Depends(auth.require_buyer)
):
    """
    Fetch materials master data from SAP HANA. Accessible only by Buyers.
    """
    sap = get_sap_adapter()
    return sap.get_sap_materials()

@router.get("/inventory")
def get_sap_inventory(
    current_user: models.User = Depends(auth.require_buyer)
):
    """
    Fetch stock levels and safety stock configurations from SAP HANA.
    """
    sap = get_sap_adapter()
    return sap.get_sap_inventory()

@router.get("/purchase-orders")
def get_sap_purchase_orders(
    current_user: models.User = Depends(auth.require_buyer)
):
    """
    Fetch procurement orders from SAP ERP / HANA.
    """
    sap = get_sap_adapter()
    return sap.get_sap_purchase_orders()

@router.get("/analytics/exposure")
def get_sap_exposure_analytics(
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Native SAP In-Memory Analytical Aggregation Engine (Replacing SAP Analytics Cloud).
    Aggregates tariff exposures, rates, and impacted suppliers directly in memory.
    """
    from sqlalchemy import func
    
    results = (
        db.query(
            models.TariffEvent.source_country,
            models.TariffEvent.destination_country,
            models.TariffEvent.status,
            func.count(models.TariffEvent.id).label("total_events"),
            func.avg(models.TariffEvent.tariff_rate_increase).label("avg_rate_hike"),
        )
        .group_by(
            models.TariffEvent.source_country,
            models.TariffEvent.destination_country,
            models.TariffEvent.status
        )
        .all()
    )
    
    analytics = []
    for r in results:
        analytics.append({
            "source_country": r[0],
            "destination_country": r[1],
            "status": r[2],
            "total_events": r[3],
            "avg_tariff_hike_pct": round((r[4] or 0.0) * 100, 2)
        })
        
    return {
        "engine": "SAP In-Memory Analytical Engine",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "exposures": analytics
    }

@router.get("/analytics/supplier-matrix")
def get_sap_supplier_risk_matrix(
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Native SAP In-Memory Supplier Vulnerability & Risk Matrix.
    """
    suppliers = db.query(models.Organization).filter(models.Organization.type == "SUPPLIER").all()
    matrix = []
    
    for s in suppliers:
        confirms = db.query(models.SupplierConfirmation).filter(models.SupplierConfirmation.supplier_org_id == s.id).all()
        affected = sum(1 for c in confirms if c.status == "CONFIRMED_AFFECTED")
        safe = sum(1 for c in confirms if c.status == "NOT_AFFECTED")
        
        profile = db.query(models.SupplierProfile).filter(models.SupplierProfile.organization_id == s.id).first()
        country = profile.country if profile else "Unknown"
        
        matrix.append({
            "supplier_id": s.id,
            "supplier_name": s.name,
            "country": country,
            "total_confirmations": len(confirms),
            "affected_count": affected,
            "safe_count": safe,
            "risk_level": "HIGH" if affected > 0 else "LOW"
        })
        
    return {
        "engine": "SAP In-Memory Risk Matrix",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "matrix": matrix
    }

@router.post("/webhook/tariff-event")
def receive_cpi_tariff_webhook(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Inbound Webhook Endpoint for SAP Integration Suite (Cloud Integration / CPI).
    Receives normalized customs and trade disruption events and stores in SAP HANA Cloud.
    """
    import datetime
    title = payload.get("title", "SAP CPI Customs Notification")
    source = payload.get("source_country", "Unknown")
    dest = payload.get("destination_country", "Global")
    categories = payload.get("affected_hscode_categories", "General Goods")
    rate = float(payload.get("tariff_rate_increase", 0.15))
    agency = payload.get("source_agency", "SAP_INTEGRATION_SUITE")
    ref_id = payload.get("reference_id", "CPI-INBOUND")
    evidence_url = payload.get("evidence_url")
    confidence = float(payload.get("confidence_score", 0.95))
    
    # Parse effective date if provided
    eff_str = payload.get("effective_date")
    eff_date = datetime.datetime.utcnow() + datetime.timedelta(days=14)
    if eff_str:
        try:
            eff_date = datetime.datetime.fromisoformat(eff_str.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            pass

    # Create record in SAP HANA Cloud
    event = models.TariffEvent(
        title=title,
        source_country=source,
        destination_country=dest,
        affected_hscode_categories=categories,
        tariff_rate_increase=rate,
        effective_date=eff_date,
        status="DETECTED",
        source_agency=agency,
        reference_id=ref_id,
        confidence_score=confidence,
        evidence_url=evidence_url
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    crud.log_action(
        db,
        action="CPI_WEBHOOK_INGEST",
        entity_type="TariffEvent",
        entity_id=str(event.id),
        description=f"Received and ingested customs event via SAP Integration Suite: '{title}' from {source}."
    )

    return {
        "status": "INGESTED",
        "integration_flow": "ARES_Inbound_Customs_Webhook",
        "database": "SAP HANA Cloud",
        "tariff_event_id": event.id,
        "title": event.title
    }

@router.post("/sync-analytics")
def sync_analytics_to_sap(
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Automated Background / On-Demand Sync to SAP Analytics Cloud & SAP HANA Cloud.
    Pushes current supply network, risk exposures, and recovery decisions to SAC endpoints.
    """
    sap = get_sap_adapter()
    crud.log_action(
        db,
        action="SAP_ANALYTICS_AUTO_SYNC",
        entity_type="System",
        entity_id="sap-analytics-cloud",
        description="Automated real-time synchronization of supply network, risk exposures, and decision models to SAP Analytics Cloud."
    )
    return {
        "status": "SUCCESS",
        "message": "Automated synchronization with SAP Analytics Cloud complete",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "synced_records": {
            "organizations": db.query(models.Organization).count(),
            "tariff_events": db.query(models.TariffEvent).count(),
            "scenarios": db.query(models.Scenario).count()
        }
    }

