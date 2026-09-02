"""
expert_engine.py — ARES Dynamic Multi-Tier Expert Resilience Engine

Provides a dynamic, rule-based optimization engine that generates multi-criteria
recovery scenarios based on real database conditions, supplier capacities, lead times,
and routes when LLM cloud services are unavailable or rate-limited.
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from .. import models

logger = logging.getLogger(__name__)

class ExpertResilienceEngine:
    """
    Enterprise-grade dynamic rule solver that creates mathematically feasible,
    multi-objective supply chain mitigation plans without requiring external LLMs.
    """
    
    @staticmethod
    def generate_resilience_plans(
        db: Session,
        event: models.TariffEvent,
        product: models.Product,
        demand_qty: int,
        affected_supplier_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates 3 multi-objective mitigation strategies based on real database state:
        1. COST: Minimum total cost allocation
        2. SPEED: Fastest lead time & express transit allocation
        3. BALANCED: Multi-vendor risk mitigation split
        """
        affected_supplier_ids = affected_supplier_ids or []
        
        # 1. Query all active supplier conditions for this product
        conditions = (
            db.query(models.SupplierCondition)
            .join(models.Organization, models.Organization.id == models.SupplierCondition.supplier_org_id)
            .filter(
                models.SupplierCondition.product_id == product.id,
                models.Organization.onboarding_status.in_(["APPROVED", "ACTIVE"])
            )
            .all()
        )
        
        if not conditions:
            logger.warning(f"No active supplier conditions found for product {product.id}.")
            return []

        # 2. Query available routes
        routes = db.query(models.Route).filter(models.Route.active == True).all()
        air_routes = [r for r in routes if r.mode == "AIR"]
        ocean_routes = [r for r in routes if r.mode in ["OCEAN", "ROAD", "RAIL"]]

        # Sort suppliers by cost and lead time
        cost_sorted = sorted(conditions, key=lambda c: c.base_price)
        speed_sorted = sorted(conditions, key=lambda c: c.lead_time_days)
        
        # Filter unaffected suppliers if possible
        unaffected_conditions = [c for c in conditions if c.supplier_org_id not in affected_supplier_ids]
        candidate_pool = unaffected_conditions if unaffected_conditions else conditions

        scenarios = []

        # ─── STRATEGY 1: COST OPTIMIZED ──────────────────────────────────────────
        cost_actions = []
        remaining_demand = demand_qty
        for cond in sorted(candidate_pool, key=lambda c: c.base_price):
            if remaining_demand <= 0:
                break
            alloc = min(remaining_demand, max(cond.capacity_per_week, cond.moq))
            best_route = ocean_routes[0].id if ocean_routes else (routes[0].id if routes else None)
            
            cost_actions.append({
                "action_type": "INCREASE_ALLOCATION",
                "supplier_org_id": cond.supplier_org_id,
                "product_id": product.id,
                "quantity": alloc,
                "route_id": best_route,
                "cost_impact": round(alloc * cond.base_price * (1 + (event.tariff_rate_increase if cond.supplier_org_id in affected_supplier_ids else 0)), 2)
            })
            remaining_demand -= alloc

        if cost_actions:
            scenarios.append({
                "name": f"Cost-Optimal Sourcing for {product.name}",
                "objective": "COST",
                "actions": cost_actions,
                "notes": "Prioritizes lowest unit base price suppliers and standard economical ocean freight. Subject to weekly capacity limits.",
                "cost": sum(a["cost_impact"] for a in cost_actions),
                "time_days": max(c.lead_time_days for c in candidate_pool[:len(cost_actions)]),
                "risk": 18.0 if unaffected_conditions else 38.0,
                "continuity": 100.0 if remaining_demand <= 0 else round(((demand_qty - remaining_demand) / demand_qty) * 100, 1)
            })

        # ─── STRATEGY 2: SPEED OPTIMIZED ─────────────────────────────────────────
        speed_actions = []
        remaining_demand = demand_qty
        for cond in sorted(candidate_pool, key=lambda c: c.lead_time_days):
            if remaining_demand <= 0:
                break
            alloc = min(remaining_demand, max(cond.capacity_per_week, cond.moq))
            fastest_route = air_routes[0].id if air_routes else (routes[0].id if routes else None)
            
            speed_actions.append({
                "action_type": "CHANGE_ROUTE" if cond.supplier_org_id in affected_supplier_ids else "INCREASE_ALLOCATION",
                "supplier_org_id": cond.supplier_org_id,
                "product_id": product.id,
                "quantity": alloc,
                "route_id": fastest_route,
                "cost_impact": round(alloc * (cond.base_price * 1.15), 2)
            })
            remaining_demand -= alloc

        if speed_actions:
            scenarios.append({
                "name": f"Rapid Recovery & Air Express for {product.name}",
                "objective": "SPEED",
                "actions": speed_actions,
                "notes": "Selects lowest lead-time manufacturing plants and express air transit routes to minimize production downtime.",
                "cost": sum(a["cost_impact"] for a in speed_actions),
                "time_days": min(c.lead_time_days for c in candidate_pool[:len(speed_actions)]) + (3 if air_routes else 7),
                "risk": 12.0,
                "continuity": 100.0 if remaining_demand <= 0 else round(((demand_qty - remaining_demand) / demand_qty) * 100, 1)
            })

        # ─── STRATEGY 3: BALANCED MULTI-SOURCING ──────────────────────────────────
        if len(candidate_pool) >= 2:
            s1, s2 = candidate_pool[0], candidate_pool[1]
            q1 = int(demand_qty * 0.6)
            q2 = demand_qty - q1
            balanced_actions = [
                {
                    "action_type": "INCREASE_ALLOCATION",
                    "supplier_org_id": s1.supplier_org_id,
                    "product_id": product.id,
                    "quantity": q1,
                    "cost_impact": round(q1 * s1.base_price, 2)
                },
                {
                    "action_type": "INCREASE_ALLOCATION",
                    "supplier_org_id": s2.supplier_org_id,
                    "product_id": product.id,
                    "quantity": q2,
                    "cost_impact": round(q2 * s2.base_price, 2)
                }
            ]
            scenarios.append({
                "name": f"Dual-Source Balanced Resilience for {product.name}",
                "objective": "BALANCED",
                "actions": balanced_actions,
                "notes": "Diversifies demand 60/40 across primary and secondary suppliers to eliminate single-vendor dependency risk.",
                "cost": sum(a["cost_impact"] for a in balanced_actions),
                "time_days": max(s1.lead_time_days, s2.lead_time_days),
                "risk": 15.0,
                "continuity": 100.0
            })

        return scenarios
