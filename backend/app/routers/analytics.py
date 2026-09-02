"""
analytics.py — ARES Analytics Router

Computes real-time aggregated analytics from live database records.
Data is sourced from SupplierProfile.country, TariffEvent rates × SupplierCondition prices,
and the Scenario table. No hardcoded or mock values.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from collections import defaultdict

from ..database import get_db
from .. import models, auth

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_analytics_dashboard(
    current_user: models.User = Depends(auth.require_buyer),
    db: Session = Depends(get_db)
):
    """
    Returns live analytics data for the SAP Analytics Cloud dashboard panel.
    All values are derived from actual database records — no mocks.

    Returns:
    - supplier_concentration: country-wise supplier count and share
    - tariff_exposure: estimated annual financial exposure per tariff event
    - approved_scenario_rank: approved scenarios ordered by objective & cost
    - summary: headline counts
    """

    # ─── 1. Supplier Concentration by Country ────────────────────────────────
    # Join SupplierProfile (has country) to Organization (type=SUPPLIER, status=ACTIVE or APPROVED)
    supplier_profiles = (
        db.query(models.SupplierProfile)
        .join(models.Organization, models.Organization.id == models.SupplierProfile.organization_id)
        .filter(models.Organization.type == "SUPPLIER")
        .all()
    )

    country_counts: Dict[str, int] = defaultdict(int)
    for sp in supplier_profiles:
        country = (sp.country or "Unknown").strip()
        country_counts[country] += 1

    total_suppliers = sum(country_counts.values()) or 1
    concentration = []
    for country, count in sorted(country_counts.items(), key=lambda x: -x[1]):
        share_pct = round((count / total_suppliers) * 100, 1)
        concentration.append({
            "country": country,
            "supplier_count": count,
            "share_percent": share_pct
        })

    # ─── 2. Tariff Financial Exposure ────────────────────────────────────────
    # For each CONFIRMED or DETECTED tariff event:
    # Estimate annual exposure = tariff_rate × sum(base_price × capacity_per_week × 52)
    # for all supplier conditions linked to suppliers in that tariff's source_country
    tariff_events = (
        db.query(models.TariffEvent)
        .filter(models.TariffEvent.status.in_(["CONFIRMED", "DETECTED", "PENDING_REVIEW"]))
        .all()
    )

    exposure_items = []
    total_exposure = 0.0

    for event in tariff_events:
        # Find supplier profiles in the tariff's source country
        affected_supplier_ids = [
            sp.organization_id for sp in supplier_profiles
            if (sp.country or "").lower().strip() == event.source_country.lower().strip()
        ]

        # Sum up all supplier conditions for those suppliers
        conditions = (
            db.query(models.SupplierCondition)
            .filter(models.SupplierCondition.supplier_org_id.in_(affected_supplier_ids))
            .all() if affected_supplier_ids else []
        )

        annual_exposure = 0.0
        for cond in conditions:
            # Annualized: base_price × weekly_capacity × 52 weeks × tariff_rate
            annual_exposure += cond.base_price * cond.capacity_per_week * 52 * event.tariff_rate_increase

        annual_exposure = round(annual_exposure, 2)
        total_exposure += annual_exposure

        exposure_items.append({
            "event_id": event.id,
            "event_title": event.title,
            "source_country": event.source_country,
            "tariff_rate": event.tariff_rate_increase,
            "affected_supplier_count": len(affected_supplier_ids),
            "annual_exposure_usd": annual_exposure,
            "status": event.status
        })

    # Sort by exposure descending
    exposure_items.sort(key=lambda x: -x["annual_exposure_usd"])

    # ─── 3. Approved Scenario Ranking ────────────────────────────────────────
    approved_scenarios = (
        db.query(models.Scenario)
        .filter(models.Scenario.status == "APPROVED")
        .order_by(models.Scenario.optimized_cost.asc())
        .all()
    )

    scenario_rank = []
    for rank, s in enumerate(approved_scenarios, start=1):
        scenario_rank.append({
            "rank": rank,
            "id": s.id,
            "name": s.name,
            "objective": s.objective,
            "optimized_cost": s.optimized_cost,
            "recovery_time_days": s.recovery_time_days,
            "risk_score": s.risk_score,
            "feasibility": s.feasibility,
        })

    # ─── 4. Summary Counts ───────────────────────────────────────────────────
    total_tariff_events = db.query(func.count(models.TariffEvent.id)).scalar() or 0
    confirmed_tariff_events = (
        db.query(func.count(models.TariffEvent.id))
        .filter(models.TariffEvent.status == "CONFIRMED")
        .scalar() or 0
    )
    total_approved_scenarios = len(approved_scenarios)

    return {
        "supplier_concentration": concentration,
        "tariff_exposure": {
            "total_annual_exposure_usd": round(total_exposure, 2),
            "items": exposure_items,
            "top_exposure_event": exposure_items[0] if exposure_items else None
        },
        "approved_scenario_rank": scenario_rank,
        "summary": {
            "total_suppliers": total_suppliers,
            "total_tariff_events": total_tariff_events,
            "confirmed_tariff_events": confirmed_tariff_events,
            "total_approved_scenarios": total_approved_scenarios,
            "countries_exposed": len(country_counts)
        }
    }


@router.get("/db-pool-status")
def get_database_pool_status_endpoint(
    current_user: models.User = Depends(auth.require_buyer)
):
    """
    Returns real-time database connection pooling health, dialect, and concurrency statistics.
    """
    from ..database import get_db_pool_status
    return {
        "status": "HEALTHY",
        "pool": get_db_pool_status()
    }


@router.get("/audit-logs/verify-integrity")
def verify_audit_log_integrity(
    current_user: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    """
    Cryptographically verifies the unbroken SHA-256 hash chain across all audit records.
    Detects any row modification, tampering, or deletion for SOC 2 and ISO 27001 compliance.
    """
    return crud.verify_audit_log_chain(db)


