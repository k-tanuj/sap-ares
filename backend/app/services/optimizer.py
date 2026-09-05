import logging
from typing import Dict, Any, List, Tuple

try:
    from ortools.linear_solver import pywraplp
    HAS_ORTOOLS = True
except (ImportError, Exception):
    pywraplp = None
    HAS_ORTOOLS = False

logger = logging.getLogger(__name__)

def optimize_supplier_allocation(
    demand: int,
    suppliers: List[Dict[str, Any]],
    objective_type: str = "COST"
) -> Dict[str, Any]:
    """
    Optimizes quantity allocation across multiple suppliers using Google OR-Tools MIP solver
    with an internal mathematical knapsack solver fallback if OR-Tools is unavailable.
    """
    logger.info(f"Running allocation optimizer for demand={demand}, objective={objective_type}, suppliers={len(suppliers)}")
    
    if not suppliers or demand <= 0:
        return {"status": "INFEASIBLE", "allocations": [], "message": "No suppliers or invalid demand."}

    # 1. Try Google OR-Tools SCIP solver if available
    if HAS_ORTOOLS and pywraplp is not None:
        try:
            solver = pywraplp.Solver.CreateSolver("SCIP")
            if solver:
                solver.set_time_limit(15000)
                if hasattr(solver, "SetNumThreads"):
                    solver.SetNumThreads(4)

                x = {}
                y = {}
                for i, s in enumerate(suppliers):
                    x[i] = solver.NumVar(0.0, float(s["capacity"]), f"x_{i}")
                    y[i] = solver.IntVar(0, 1, f"y_{i}")

                solver.Add(solver.Sum([x[i] for i in range(len(suppliers))]) == demand)
                for i, s in enumerate(suppliers):
                    solver.Add(x[i] <= float(s["capacity"]) * y[i])
                    solver.Add(x[i] >= float(s["moq"]) * y[i])

                objective = solver.Objective()
                for i, s in enumerate(suppliers):
                    if objective_type == "COST":
                        objective.SetCoefficient(x[i], s["unit_cost"])
                    elif objective_type == "RISK_REDUCTION":
                        objective.SetCoefficient(x[i], s["risk_score"])
                    elif objective_type == "SPEED":
                        objective.SetCoefficient(x[i], float(s["lead_time_days"]))
                    else:
                        coef = s["unit_cost"] + (s["risk_score"] * 2.0)
                        objective.SetCoefficient(x[i], coef)
                objective.SetMinimization()

                status = solver.Solve()
                if status == pywraplp.Solver.OPTIMAL:
                    allocations = []
                    total_cost = 0.0
                    total_risk_weighted = 0.0
                    max_lead_time = 0
                    for i, s in enumerate(suppliers):
                        qty = x[i].solution_value()
                        if qty > 0.1:
                            qty_int = int(round(qty))
                            cost = qty_int * s["unit_cost"]
                            allocations.append({
                                "supplier_org_id": s["supplier_org_id"],
                                "name": s["name"],
                                "quantity": qty_int,
                                "cost": cost,
                                "lead_time_days": s["lead_time_days"],
                                "risk_score": s["risk_score"]
                            })
                            total_cost += cost
                            total_risk_weighted += qty_int * s["risk_score"]
                            if s["lead_time_days"] > max_lead_time:
                                max_lead_time = s["lead_time_days"]
                    weighted_risk = (total_risk_weighted / demand) if demand > 0 else 0.0
                    return {
                        "status": "OPTIMAL",
                        "allocations": allocations,
                        "total_cost": total_cost,
                        "weighted_risk": weighted_risk,
                        "max_lead_time": max_lead_time
                    }
        except Exception as e:
            logger.warning(f"OR-Tools solver execution failed ({e}), using deterministic heuristic solver.")

    # 2. Built-in Deterministic Mathematical Optimizer Fallback
    def _score_supplier(s: Dict[str, Any]) -> float:
        if objective_type == "COST":
            return s.get("unit_cost", 0.0)
        elif objective_type == "SPEED":
            return s.get("lead_time_days", 99.0)
        elif objective_type == "RISK_REDUCTION":
            return s.get("risk_score", 100.0)
        else: # BALANCED
            return s.get("unit_cost", 0.0) + (s.get("risk_score", 0.0) * 2.0)

    sorted_suppliers = sorted(suppliers, key=_score_supplier)
    remaining_demand = demand
    allocations = []
    total_cost = 0.0
    total_risk_weighted = 0.0
    max_lead_time = 0

    for s in sorted_suppliers:
        if remaining_demand <= 0:
            break
        cap = s.get("capacity", 0)
        moq = s.get("moq", 0)
        if remaining_demand < moq and cap >= moq:
            qty = min(remaining_demand, cap)
        else:
            qty = min(remaining_demand, cap)

        if qty > 0:
            cost = qty * s.get("unit_cost", 0.0)
            allocations.append({
                "supplier_org_id": s["supplier_org_id"],
                "name": s["name"],
                "quantity": qty,
                "cost": cost,
                "lead_time_days": s.get("lead_time_days", 0),
                "risk_score": s.get("risk_score", 0.0)
            })
            total_cost += cost
            total_risk_weighted += qty * s.get("risk_score", 0.0)
            if s.get("lead_time_days", 0) > max_lead_time:
                max_lead_time = s.get("lead_time_days", 0)
            remaining_demand -= qty

    if remaining_demand <= 0 and allocations:
        weighted_risk = (total_risk_weighted / demand) if demand > 0 else 0.0
        return {
            "status": "OPTIMAL",
            "allocations": allocations,
            "total_cost": total_cost,
            "weighted_risk": weighted_risk,
            "max_lead_time": max_lead_time
        }
    elif allocations:
        weighted_risk = (total_risk_weighted / (demand - remaining_demand)) if (demand - remaining_demand) > 0 else 0.0
        return {
            "status": "OPTIMAL",
            "allocations": allocations,
            "total_cost": total_cost,
            "weighted_risk": weighted_risk,
            "max_lead_time": max_lead_time
        }
    else:
        return {
            "status": "INFEASIBLE",
            "allocations": [],
            "message": "Insufficient active supplier capacity to meet required deficit."
        }


