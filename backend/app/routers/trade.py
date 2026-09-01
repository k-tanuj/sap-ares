"""
Trade Ingestion Router for ARES.

Provides endpoints for:
- Fetching events from India trade sources (CBIC, ICEGATE, DGFT)
- Manual event entry (already in tariffs router)
- CSV/file import ingestion
- Listing available trade sources and their status
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
import datetime

from .. import crud, schemas, auth, models
from ..database import get_db
from ..config import settings
from ..services.trade_adapters import get_trade_adapters, NormalizedTradeEvent

router = APIRouter(prefix="/api/trade", tags=["trade-ingestion"])


@router.get("/sources")
def list_trade_sources(
    current_user: models.User = Depends(auth.require_buyer),
):
    """
    List all registered trade intelligence sources and their availability status.
    """
    adapters = get_trade_adapters(use_mock=settings.USE_MOCK_SAP)
    return [
        {
            "source": adapter.get_source_name(),
            "available": adapter.is_available(),
            "mode": "MOCK" if settings.USE_MOCK_SAP else "REAL"
        }
        for adapter in adapters
    ]


@router.post("/ingest", response_model=List[schemas.TariffEventResponse])
def ingest_from_trade_sources(
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Trigger ingestion from all configured India trade sources (CBIC, ICEGATE, DGFT).
    
    Pipeline: Adapter → Normalize → TariffEvent(DETECTED) → Human Review
    
    Returns the list of newly created tariff events.
    Skips events that already exist (by reference_id).
    """
    adapters = get_trade_adapters(use_mock=settings.USE_MOCK_SAP)
    created_events = []

    for adapter in adapters:
        try:
            normalized_events = adapter.fetch_latest()
            for event in normalized_events:
                # Deduplication: skip if reference_id already exists
                if event.reference_id:
                    existing = db.query(models.TariffEvent).filter(
                        models.TariffEvent.reference_id == event.reference_id
                    ).first()
                    if existing:
                        continue

                if getattr(event, "event_type", "TARIFF") == "SIGNAL":
                    # Create TradeSignal instead of TariffEvent
                    trade_signal = models.TradeSignal(
                        title=event.title,
                        source_country=event.source_country,
                        destination_country=event.destination_country,
                        affected_hscode_categories=event.affected_hscode_categories,
                        signal_type="DATA_ANOMALY",
                        severity=event.confidence_score, # Using confidence as severity proxy for MVP
                        detected_at=event.effective_date,
                        source_agency=event.source_agency,
                        reference_id=event.reference_id,
                        evidence_url=event.evidence_url,
                        raw_data=event.raw_data
                    )
                    db.add(trade_signal)
                    db.flush()
                    # We don't add to created_events because the response schema expects TariffEventResponse
                    # For a full implementation, we would have a separate endpoint or unified response.
                    # We will just log it.
                    crud.create_audit_log(
                        db,
                        user_id=current_user.id,
                        email=current_user.email,
                        action="TRADE_INGEST_SIGNAL",
                        entity_type="TradeSignal",
                        entity_id=str(trade_signal.id),
                        description=f"Ingested Trade Signal from {event.source_agency}: {event.title}"
                    )
                else:
                    # Create TariffEvent in DETECTED status
                    tariff_event = models.TariffEvent(
                        title=event.title,
                        source_country=event.source_country,
                        destination_country=event.destination_country,
                        affected_hscode_categories=event.affected_hscode_categories,
                        tariff_rate_increase=event.tariff_rate_increase,
                        effective_date=event.effective_date,
                        status="DETECTED",
                        source_agency=event.source_agency,
                        reference_id=event.reference_id,
                        confidence_score=event.confidence_score,
                        evidence_url=event.evidence_url,
                    )
                    db.add(tariff_event)
                    db.flush()
                    created_events.append(tariff_event)

                    # Audit log
                    crud.create_audit_log(
                        db,
                        user_id=current_user.id,
                        email=current_user.email,
                        action="TRADE_INGEST",
                        entity_type="TariffEvent",
                        entity_id=str(tariff_event.id),
                        description=f"Ingested from {event.source_agency}: {event.title}"
                    )

        except Exception as e:
            # Log but don't fail entire ingestion for one adapter
            import logging
            logging.getLogger(__name__).error(f"Adapter {adapter.get_source_name()} failed: {e}")
            continue

    db.commit()
    # Refresh all to get generated IDs
    for evt in created_events:
        db.refresh(evt)

    return created_events


@router.post("/import-csv", response_model=List[schemas.TariffEventResponse])
def import_csv_events(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Import tariff events from a CSV file.
    
    Expected CSV columns:
    title, source_country, destination_country, affected_hscode_categories,
    tariff_rate_increase, effective_date
    
    Events are created in DETECTED status with source_agency=IMPORT.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    created_events = []

    for row in reader:
        try:
            tariff_event = models.TariffEvent(
                title=row.get("title", "Imported Event"),
                source_country=row.get("source_country", "Unknown"),
                destination_country=row.get("destination_country", "India"),
                affected_hscode_categories=row.get("affected_hscode_categories", ""),
                tariff_rate_increase=float(row.get("tariff_rate_increase", 0.0)),
                effective_date=datetime.datetime.fromisoformat(
                    row.get("effective_date", datetime.datetime.utcnow().isoformat())
                ),
                status="DETECTED",
                source_agency="IMPORT",
                reference_id=row.get("reference_id"),
            )
            db.add(tariff_event)
            db.flush()
            created_events.append(tariff_event)

            crud.create_audit_log(
                db,
                user_id=current_user.id,
                email=current_user.email,
                action="TRADE_IMPORT",
                entity_type="TariffEvent",
                entity_id=str(tariff_event.id),
                description=f"CSV import: {tariff_event.title}"
            )
        except Exception:
            continue

    db.commit()
    for evt in created_events:
        db.refresh(evt)

    return created_events
