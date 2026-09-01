import logging
from typing import Dict, Any, List, Tuple
from ortools.linear_solver import pywraplp

logger = logging.getLogger(__name__)

def optimize_supplier_allocation(
    demand: int,
    suppliers: List[Dict[str, Any]],
    objective_type: str = "COST"
) -> Dict[str, Any]:
    """
    Optimizes quantity allocation across multiple suppliers using Google OR-Tools.
    
    suppliers list elements contain:
      - supplier_org_id: str
      - name: str
      - capacity: int (available units)
      - unit_cost: float
      - moq: int (minimum order quantity)
      - risk_score: float (1-100)
      - lead_time_days: int
      
    Returns:
      A dictionary with the optimization status, allocated quantities, and total KPIs:
      {
        "status": "OPTIMAL" | "INFEASIBLE" | "NO_SOLUTION",
        "allocations": [
           {"supplier_org_id": "...", "quantity": 1200, "cost": 6000.0}
        ],
        "total_cost": 15000.0,
        "weighted_risk": 23.5,
        "max_lead_time": 5
      }
    """
    logger.info(f"Running OR-Tools allocation for demand={demand}, objective={objective_type}, suppliers={len(suppliers)}")
    
    # Create the MIP solver with SCIP backend
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        logger.error("OR-Tools solver backend SCIP could not be created")
        return {"status": "NO_SOLUTION", "allocations": [], "message": "Solver backend error"}

    # Variables
    # x[i]: quantity allocated to supplier i (continuous variable >= 0)
    # y[i]: binary variable (1 if supplier i is used, 0 otherwise)
    x = {}
    y = {}
    for i, s in enumerate(suppliers):
        x[i] = solver.NumVar(0.0, float(s["capacity"]), f"x_{i}")
        y[i] = solver.IntVar(0, 1, f"y_{i}")

    # Constraints
    # 1. Total demand must be met
    solver.Add(solver.Sum([x[i] for i in range(len(suppliers))]) == demand)

    # 2. Capacity and MOQ constraints:
    # moq * y[i] <= x[i] <= capacity * y[i]
    for i, s in enumerate(suppliers):
        # Upper bound: x[i] <= capacity * y[i]
        solver.Add(x[i] <= float(s["capacity"]) * y[i])
        # Lower bound (MOQ): x[i] >= float(s["moq"]) * y[i]
        solver.Add(x[i] >= float(s["moq"]) * y[i])

    # Objective Function
    objective = solver.Objective()
    for i, s in enumerate(suppliers):
        if objective_type == "COST":
            # Minimize total cost
            objective.SetCoefficient(x[i], s["unit_cost"])
        elif objective_type == "RISK_REDUCTION":
            # Minimize total risk
            objective.SetCoefficient(x[i], s["risk_score"])
        elif objective_type == "SPEED":
            # Minimize lead-time weighted allocation
            objective.SetCoefficient(x[i], float(s["lead_time_days"]))
        else: # BALANCED: combined cost and risk
            coef = s["unit_cost"] + (s["risk_score"] * 2.0) # Weighted formula
            objective.SetCoefficient(x[i], coef)
            
    objective.SetMinimization()

    # Solve
    status = solver.Solve()
    
    if status == pywraplp.Solver.OPTIMAL:
        allocations = []
        total_cost = 0.0
        total_risk_weighted = 0.0
        max_lead_time = 0
        
        for i, s in enumerate(suppliers):
            qty = x[i].solution_value()
            if qty > 0.1: # Threshold to filter out tiny numerical values
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
    else:
        logger.warning(f"OR-Tools solve failed with status code: {status}")
        return {
            "status": "INFEASIBLE",
            "allocations": [],
            "message": "No feasible allocation satisfies constraints (capacity or MOQ mismatch)."
        }
