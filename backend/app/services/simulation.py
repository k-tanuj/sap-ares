import logging
from sqlalchemy.orm import Session
from .. import models

logger = logging.getLogger(__name__)

def run_scenario_simulation(db: Session, scenario: models.Scenario) -> dict:
    """
    Simulates the impact of a scenario on the supply chain KPIs.
    Does NOT modify database state.
    
    1. Snapshot current state
    2. Apply scenario actions
    3. Recalculate KPIs
    4. Compare Before/After
    """
    logger.info(f"Running simulation for scenario_id={scenario.id} ('{scenario.name}')")

    # 1. Snapshot / Baseline KPIs
    # Let's compute baseline metrics from current db
    products = db.query(models.Product).all()
    inventories = db.query(models.Inventory).all()
    facilities = db.query(models.Facility).all()
    routes = db.query(models.Route).filter(models.Route.active == True).all()
    
    # Calculate baseline total cost based on active inventories and standard routes
    baseline_cost = 0.0
    for inv in inventories:
        if inv.product:
            baseline_cost += inv.quantity * inv.product.unit_cost

    # Average lead time of active routes
    baseline_lead_time = int(sum(r.lead_time_days for r in routes) / len(routes)) if routes else 10
    
    # Average supplier capacity utilization
    mfg_facilities = [f for f in facilities if f.type == "MANUFACTURING"]
    baseline_utilization = sum(f.capacity_utilization for f in mfg_facilities) / len(mfg_facilities) if mfg_facilities else 50.0

    # Total inventory units available
    total_inv_qty = sum(inv.quantity for inv in inventories)
    # Estimate safety stock coverage (simple days coverage based on dummy daily demand of 500 units)
    baseline_coverage_days = int(total_inv_qty / 500) if total_inv_qty > 0 else 0

    # Default baseline risk (based on tariff threat)
    # If the tariff rate increase is high, baseline risk is high
    tariff_event = db.query(models.TariffEvent).filter(models.TariffEvent.id == scenario.tariff_event_id).first()
    tariff_increase = tariff_event.tariff_rate_increase if tariff_event else 0.10
    baseline_risk = float(50.0 + (tariff_increase * 100)) # e.g. 50 + 25 = 75

    # Baseline continuity: since tariff is active, we have disruption (e.g. only 65% supply met)
    baseline_continuity = 65.0

    before_kpi = {
        "total_cost": round(baseline_cost, 2),
        "recovery_time_days": baseline_lead_time,
        "inventory_coverage_days": baseline_coverage_days,
        "supplier_utilization_pct": round(baseline_utilization, 1),
        "average_risk_score": round(baseline_risk, 1),
        "continuity_pct": round(baseline_continuity, 1)
    }

    # 2. Apply Scenario Actions & Recalculate (Simulation State)
    sim_cost = scenario.optimized_cost if scenario.optimized_cost > 0 else baseline_cost
    sim_lead_time = scenario.recovery_time_days if scenario.recovery_time_days > 0 else baseline_lead_time
    sim_risk = scenario.risk_score if scenario.risk_score > 0 else baseline_risk
    sim_continuity = scenario.continuity_percentage if scenario.continuity_percentage > 0 else baseline_continuity
    
    # Calculate coverage and utilization based on continuity
    sim_utilization = min(100.0, baseline_utilization + (sim_continuity * 0.2))
    sim_coverage_days = max(0, baseline_coverage_days - 2) if sim_continuity > 80 else baseline_coverage_days

    # Normalize final sim variables within boundaries
    sim_continuity = min(100.0, max(0.0, sim_continuity))
    sim_risk = min(100.0, max(0.0, sim_risk))
    if scenario.feasibility == "INFEASIBLE":
        sim_continuity = baseline_continuity # No improvement if infeasible!
        sim_risk = baseline_risk
        sim_cost = baseline_cost
        sim_lead_time = baseline_lead_time

    after_kpi = {
        "total_cost": round(sim_cost, 2),
        "recovery_time_days": sim_lead_time,
        "inventory_coverage_days": sim_coverage_days,
        "supplier_utilization_pct": round(sim_utilization, 1),
        "average_risk_score": round(sim_risk, 1),
        "continuity_pct": round(sim_continuity, 1)
    }

    return {
        "before_kpi": before_kpi,
        "after_kpi": after_kpi
    }
