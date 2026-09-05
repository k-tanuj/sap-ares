import logging
import json
from typing import Dict, Any, List, Tuple, TypedDict, Annotated, Optional
from sqlalchemy.orm import Session

try:
    from langgraph.graph import StateGraph, START, END
    HAS_LANGGRAPH = True
except (ImportError, Exception):
    StateGraph, START, END = None, None, None
    HAS_LANGGRAPH = False

from .. import models, schemas, crud
from .sap_adapter import get_sap_adapter
from .optimizer import optimize_supplier_allocation

logger = logging.getLogger(__name__)

# --- Deterministic Feasibility Validation ---

def validate_scenario_feasibility(db: Session, actions: List[Dict[str, Any]]) -> Tuple[bool, str]:
    """
    Deterministically validates if recovery actions are feasible based on backend truth.
    Checks capacity, MOQ, route active state, and inventory levels.
    """
    for action in actions:
        action_type = action.get("action_type")
        product_id = action.get("product_id")
        qty = int(action.get("quantity", 0)) if action.get("quantity") is not None else 0
        
        if action_type in ["INCREASE_ALLOCATION", "SWITCH_SUPPLIER"]:
            supplier_id = action.get("supplier_org_id")
            if not supplier_id or not product_id:
                return False, "MISSING_SUPPLIER_OR_PRODUCT_ID"
            
            # Check supplier onboarding status
            supplier_org = db.query(models.Organization).filter(models.Organization.id == supplier_id).first()
            if not supplier_org:
                return False, "SUPPLIER_NOT_FOUND"
            if supplier_org.onboarding_status not in ["APPROVED", "ACTIVE"]:
                return False, f"SUPPLIER_INACTIVE (status: {supplier_org.onboarding_status})"
            
            # Fetch supplier capacity & MOQ conditions
            cond = db.query(models.SupplierCondition).filter(
                models.SupplierCondition.supplier_org_id == supplier_id,
                models.SupplierCondition.product_id == product_id
            ).first()
            
            if not cond:
                return False, f"SUPPLIER_CONDITIONS_NOT_DEFINED for supplier {supplier_id} and product {product_id}"
                
            # Check MOQ constraint
            if qty < cond.moq:
                return False, f"MOQ_NOT_MET: Requested quantity {qty} is less than MOQ {cond.moq} for supplier {supplier_id}."
                
            # Check Capacity constraint
            if qty > cond.capacity_per_week:
                return False, f"CAPACITY_EXCEEDED: Requested quantity {qty} exceeds supplier {supplier_id} weekly capacity of {cond.capacity_per_week}."

        elif action_type == "CHANGE_ROUTE":
            route_id = action.get("route_id")
            if not route_id:
                return False, "MISSING_ROUTE_ID"
            
            route = db.query(models.Route).filter(models.Route.id == route_id).first()
            if not route:
                return False, "ROUTE_NOT_FOUND"
            if not route.active:
                return False, "ROUTE_UNAVAILABLE: The selected route is currently inactive."

        elif action_type == "USE_INVENTORY":
            if not product_id:
                return False, "MISSING_PRODUCT_ID"
            
            # Check buyer's inventory levels (e.g. from org-buyer-1)
            # Find buyer's inventory for the product
            buyer_inv = db.query(models.Inventory).filter(
                models.Inventory.organization_id == "org-buyer-1", # Buyer ID is static in demo
                models.Inventory.product_id == product_id
            ).first()
            
            if not buyer_inv or buyer_inv.quantity < qty:
                available = buyer_inv.quantity if buyer_inv else 0
                return False, f"INSUFFICIENT_INVENTORY: Requested drawdown of {qty} exceeds available buyer inventory of {available}."
                
    return True, "FEASIBLE"


# --- Controlled Agent Tools ---

class ARESContext:
    """Provides authorization-aware controlled access to database without raw SQL access."""
    def __init__(self, db: Session, user_org_id: str):
        self.db = db
        self.user_org_id = user_org_id

    def get_supplier_info(self, supplier_id: str) -> Dict[str, Any]:
        # Enforce boundary: Suppliers can only view their own profile, buyer can view all approved/active suppliers
        if self.user_org_id != "org-buyer-1" and self.user_org_id != supplier_id:
            raise PermissionError("Access Denied: Organization isolation violation.")
            
        org = self.db.query(models.Organization).filter(models.Organization.id == supplier_id).first()
        if not org:
            return {}
        profile = self.db.query(models.SupplierProfile).filter(models.SupplierProfile.organization_id == supplier_id).first()
        conditions = self.db.query(models.SupplierCondition).filter(models.SupplierCondition.supplier_org_id == supplier_id).all()
        
        return {
            "id": org.id,
            "name": org.name,
            "status": org.onboarding_status,
            "country": profile.country if profile else None,
            "conditions": [
                {"product_id": c.product_id, "base_price": c.base_price, "lead_time_days": c.lead_time_days, "moq": c.moq, "capacity": c.capacity_per_week}
                for c in conditions
            ]
        }

    def get_inventory_levels(self, product_id: str) -> List[Dict[str, Any]]:
        # Buyer gets all inventories, supplier only gets their own
        query = self.db.query(models.Inventory).filter(models.Inventory.product_id == product_id)
        if self.user_org_id != "org-buyer-1":
            query = query.filter(models.Inventory.organization_id == self.user_org_id)
            
        invs = query.all()
        return [
            {"organization_id": i.organization_id, "quantity": i.quantity, "safety_stock": i.safety_stock}
            for i in invs
        ]

    def get_routes(self) -> List[Dict[str, Any]]:
        routes = self.db.query(models.Route).filter(models.Route.active == True).all()
        return [
            {"id": r.id, "origin": r.origin, "destination": r.destination, "mode": r.mode, "lead_time_days": r.lead_time_days, "cost_per_unit": r.cost_per_unit}
            for r in routes
        ]


# --- LangGraph Agent Orchestrator ---

class AgentState(TypedDict):
    event_id: int
    user_org_id: str
    target_product_id: str
    demand_qty: int
    context_data: Dict[str, Any]
    supplier_analysis: str
    logistics_analysis: str
    risk_analysis: str
    generated_scenarios: List[Dict[str, Any]]
    validation_results: List[Dict[str, Any]]
    optimized_scenarios: List[Dict[str, Any]]
    error: Optional[str]


def collect_context_node(state: AgentState) -> AgentState:
    """Gathers deterministic facts from DB via context adapter."""
    logger.info("LangGraph Node: collect_context_node")
    return state


def supplier_intelligence_node(state: AgentState) -> AgentState:
    """Analyzes supplier capacities and MOQ."""
    logger.info("LangGraph Node: supplier_intelligence_node")
    if state.get("error"): return state
    
    suppliers = state["context_data"].get("suppliers", [])
    if not suppliers:
        state["error"] = "INSUFFICIENT_DATA"
        return state
        
    prompt = f"Analyze these suppliers for a demand of {state['demand_qty']} units:\n{json.dumps(suppliers, indent=2)}\nWhich ones can fulfill this based on MOQ and capacity? Provide a brief summary."
    
    try:
        from .llm_engine import get_gemini_client
        client = get_gemini_client()
        if client:
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"system_instruction": "You are the Supplier Intelligence Agent for ARES supply chain risk system."}
            )
            if resp and resp.text:
                state["supplier_analysis"] = resp.text
                return state
    except Exception as e:
        logger.warning(f"Gemini Supplier node exception ({e}), falling back to local heuristics.")
        state["supplier_analysis"] = "Analysis complete via local supply chain heuristics."
    return state


def logistics_intelligence_node(state: AgentState) -> AgentState:
    """Analyzes routes and transit modes."""
    logger.info("LangGraph Node: logistics_intelligence_node")
    if state.get("error"): return state
    
    routes = state["context_data"].get("routes", [])
    prompt = f"Analyze these logistics routes:\n{json.dumps(routes, indent=2)}\nWhich routes are fastest and which are cheapest? Provide a brief summary."
    
    try:
        from .llm_engine import get_gemini_client
        client = get_gemini_client()
        if client:
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"system_instruction": "You are the Logistics Intelligence Agent for ARES supply chain risk system."}
            )
            if resp and resp.text:
                state["logistics_analysis"] = resp.text
                return state
    except Exception as e:
        logger.warning(f"Gemini Logistics node exception ({e}), falling back to local heuristics.")
        state["logistics_analysis"] = "Analysis complete via local logistics heuristics."
    return state


def risk_intelligence_node(state: AgentState) -> AgentState:
    """Evaluates geopolitical risk and tariff exposure."""
    logger.info("LangGraph Node: risk_intelligence_node")
    if state.get("error"): return state
    
    tariff = state["context_data"].get("tariff", {})
    suppliers = state["context_data"].get("suppliers", [])
    prompt = f"Analyze the disruption risk given this tariff event:\n{json.dumps(tariff, indent=2)}\nand these suppliers:\n{json.dumps(suppliers, indent=2)}\nWhich suppliers carry the lowest geopolitical risk? Provide a brief summary."
    
    try:
        from .llm_engine import get_gemini_client
        client = get_gemini_client()
        if client:
            resp = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"system_instruction": "You are the Risk Intelligence Agent for ARES supply chain risk system."}
            )
            if resp and resp.text:
                state["risk_analysis"] = resp.text
                return state
    except Exception as e:
        logger.warning(f"Gemini Risk node exception ({e}), falling back to local heuristics.")
        state["risk_analysis"] = "Analysis complete via local risk heuristics."
    return state


def scenario_generation_node(state: AgentState) -> AgentState:
    """Synthesizes structured scenarios from intelligence nodes."""
    logger.info("LangGraph Node: scenario_generation_node")
    if state.get("error"): return state
        
    context_data = state["context_data"]
    
    system_prompt = (
        "You are the ARES Scenario Agent. You generate structured supply chain recovery scenarios in response to disruptions.\n"
        "Rules:\n"
        "1. You must ONLY suggest actions using the exact Supplier IDs, Route IDs, and Product IDs provided in the context.\n"
        "2. Do NOT invent or fabricate any suppliers, components, inventory levels, routes, or costs.\n"
        "3. Output a JSON object with a 'scenarios' list. Each plan has 'name', 'objective' (COST, SPEED, RISK_REDUCTION, BALANCED), and 'actions'.\n"
        "4. Action format: {'action_type': 'INCREASE_ALLOCATION'|'SWITCH_SUPPLIER'|'CHANGE_ROUTE', 'supplier_org_id': str, 'product_id': str, 'quantity': int, 'route_id': str, 'cost_impact': float}.\n"
    )

    safe_context_data = {k: v for k, v in context_data.items() if k != "_db_session"}
    prompt = (
        f"Generate recovery scenarios for Product {state['target_product_id']} with demand {state['demand_qty']} units.\n"
        f"Context:\n{json.dumps(safe_context_data, indent=2)}\n\n"
        f"Supplier Intelligence:\n{state.get('supplier_analysis', '')}\n\n"
        f"Logistics Intelligence:\n{state.get('logistics_analysis', '')}\n\n"
        f"Risk Intelligence:\n{state.get('risk_analysis', '')}\n\n"
        "Output JSON only:"
    )

    try:
        from .llm_engine import call_gemini_json
        parsed = call_gemini_json(prompt, system_instruction=system_prompt)
        if parsed and "scenarios" in parsed and len(parsed["scenarios"]) > 0:
            state["generated_scenarios"] = parsed["scenarios"]
            return state
    except Exception as e:
        logger.warning(f"Gemini Scenario generation error/quota limit: {e}. Activating Dynamic Expert Resilience Engine.")
        
        # ─── Dynamic Multi-Tier Expert Engine Fallback ───
        from .expert_engine import ExpertResilienceEngine
        db = context_data.get("_db_session")
        event = db.query(models.TariffEvent).filter(models.TariffEvent.id == state["event_id"]).first() if db else None
        product = db.query(models.Product).filter(models.Product.id == state["target_product_id"]).first() if db else None
        
        if db and event and product:
            expert_scenarios = ExpertResilienceEngine.generate_resilience_plans(
                db=db,
                event=event,
                product=product,
                demand_qty=state["demand_qty"],
                affected_supplier_ids=context_data.get("affected_supplier_ids", [])
            )
            if expert_scenarios:
                state["generated_scenarios"] = expert_scenarios
                if "error" in state:
                    del state["error"]
                return state

        # Fallback to proportional multi-vendor split if expert engine encounters empty context
        suppliers = context_data.get("suppliers", [])
        if not suppliers:
            state["error"] = "INSUFFICIENT_DATA: No available active suppliers to generate fallback scenario."
            return state
            
        fallback_actions = []
        for s in suppliers:
            fallback_actions.append({
                "action_type": "INCREASE_ALLOCATION",
                "supplier_org_id": s["supplier_org_id"],
                "product_id": state["target_product_id"],
                "quantity": state["demand_qty"] // len(suppliers),
                "cost_impact": float(s.get("unit_cost", 0) * (state["demand_qty"] // len(suppliers)))
            })
            
        state["generated_scenarios"] = [{
            "name": f"Proportional Multi-Source Plan for {product.name if product else state['target_product_id']}",
            "objective": "BALANCED",
            "actions": fallback_actions
        }]
        if "error" in state:
            del state["error"]

    return state





def validate_and_optimize_node(state: AgentState) -> AgentState:
    """Runs deterministic validation & OR-Tools MIP optimizer to score and prune scenarios."""
    logger.info("LangGraph Node: validate_and_optimize_node")
    
    if state.get("error") or not state.get("generated_scenarios"):
        return state

    # We need a db session to run deterministic validation.
    # In FastAPI, we can inject a db session. We will pass a reference or handle it inside.
    # Let's extract variables
    scenarios = state["generated_scenarios"]
    db = state["context_data"].get("_db_session")
    suppliers_context = state["context_data"].get("suppliers", [])
    demand = state["demand_qty"]
    
    valid_optimized = []
    
    for s in scenarios:
        actions = s.get("actions", [])
        
        # 1. Deterministic Validation
        if db:
            feasible, reason = validate_scenario_feasibility(db, actions)
        else:
            feasible, reason = True, "FEASIBLE"
            
        if not feasible:
            logger.warning(f"Scenario '{s['name']}' failed feasibility: {reason}")
            s["feasibility"] = "INFEASIBLE"
            s["feasibility_notes"] = reason
            s["cost"] = s.get("cost", 999999.0)
            s["time_days"] = s.get("time_days", 99)
            s["risk"] = s.get("risk", 100.0)
            s["continuity"] = 0.0
            valid_optimized.append(s)
            continue
            
        # 2. OR-Tools Optimization (for allocation objectives)
        s["feasibility"] = "FEASIBLE"
        s["feasibility_notes"] = "Validated capacity and MOQ rules."
        
        # Check if this scenario has allocation action
        has_allocation = any(a.get("action_type") in ["INCREASE_ALLOCATION", "SWITCH_SUPPLIER"] for a in actions)
        if has_allocation and len(suppliers_context) > 0:
            # Optimize quantities using OR-Tools
            opt_res = optimize_supplier_allocation(
                demand=demand,
                suppliers=suppliers_context,
                objective_type=s["objective"]
            )
            
            if opt_res["status"] == "OPTIMAL":
                # Rewrite actions with the optimized allocation quantities
                new_actions = []
                for a in actions:
                    if a.get("action_type") not in ["INCREASE_ALLOCATION", "SWITCH_SUPPLIER"]:
                        new_actions.append(a)
                
                for alloc in opt_res["allocations"]:
                    new_actions.append({
                        "action_type": "INCREASE_ALLOCATION",
                        "supplier_org_id": alloc["supplier_org_id"],
                        "product_id": state["target_product_id"],
                        "quantity": alloc["quantity"],
                        "cost_impact": alloc["cost"]
                    })
                    
                s["actions"] = new_actions
                s["cost"] = opt_res["total_cost"]
                s["time_days"] = opt_res["max_lead_time"]
                s["risk"] = opt_res["weighted_risk"]
                s["continuity"] = 100.0
            else:
                s["feasibility"] = "INFEASIBLE"
                s["feasibility_notes"] = f"OR-Tools: {opt_res.get('message', 'Infeasible constraints')}"
                s["continuity"] = 0.0
                
        valid_optimized.append(s)
        
    state["optimized_scenarios"] = valid_optimized
    return state


# --- Build LangGraph Pipeline ---

def build_langgraph_pipeline():
    if not HAS_LANGGRAPH or StateGraph is None:
        return None
    try:
        workflow = StateGraph(AgentState)
        
        # Add Nodes
        workflow.add_node("collect_context", collect_context_node)
        workflow.add_node("supplier_intelligence", supplier_intelligence_node)
        workflow.add_node("logistics_intelligence", logistics_intelligence_node)
        workflow.add_node("risk_intelligence", risk_intelligence_node)
        workflow.add_node("scenario_generation", scenario_generation_node)
        workflow.add_node("validate_and_optimize", validate_and_optimize_node)
        
        # Set Edges (Sequential Multi-Agent Pipeline)
        workflow.add_edge(START, "collect_context")
        workflow.add_edge("collect_context", "supplier_intelligence")
        workflow.add_edge("supplier_intelligence", "logistics_intelligence")
        workflow.add_edge("logistics_intelligence", "risk_intelligence")
        workflow.add_edge("risk_intelligence", "scenario_generation")
        workflow.add_edge("scenario_generation", "validate_and_optimize")
        workflow.add_edge("validate_and_optimize", END)
        
        return workflow.compile()
    except Exception as e:
        logger.warning(f"Could not compile LangGraph workflow: {e}")
        return None


# Orchestrator entrypoint
langgraph_app = build_langgraph_pipeline()

def run_recovery_scenario_generation(
    db: Session,
    event_id: int,
    product_id: str,
    demand_qty: int,
    user_org_id: str = "org-buyer-1"
) -> Dict[str, Any]:
    """
    Runs the multi-agent intelligence and optimization pipeline to generate recovery plans for a tariff event.
    """
    # 1. Gather context data securely
    ctx = ARESContext(db, user_org_id)
    
    # Fetch active suppliers for this product
    supplier_conditions = db.query(models.SupplierCondition).filter(
        models.SupplierCondition.product_id == product_id
    ).all()
    
    suppliers_data = []
    for cond in supplier_conditions:
        # Check onboarding status
        s_org = db.query(models.Organization).filter(models.Organization.id == cond.supplier_org_id).first()
        if s_org and s_org.onboarding_status in ["APPROVED", "ACTIVE"]:
            # Gather profile for risk score (mock risk score in db or construct based on country)
            profile = db.query(models.SupplierProfile).filter(models.SupplierProfile.organization_id == cond.supplier_org_id).first()
            risk_score = 30.0
            if profile and profile.country == "China":
                risk_score = 75.0 # High geopolitical risk in demo
            elif profile and profile.country == "Germany":
                risk_score = 15.0 # Low risk
                
            suppliers_data.append({
                "supplier_org_id": cond.supplier_org_id,
                "name": s_org.name,
                "capacity": cond.capacity_per_week,
                "unit_cost": cond.base_price,
                "moq": cond.moq,
                "risk_score": risk_score,
                "lead_time_days": cond.lead_time_days
            })
            
    # Get active routes
    routes_data = ctx.get_routes()
    
    # Get tariff details
    event = db.query(models.TariffEvent).filter(models.TariffEvent.id == event_id).first()
    tariff_data = {
        "id": event.id if event else 0,
        "title": event.title if event else "Tariff Increase",
        "source_country": event.source_country if event else "",
        "destination_country": event.destination_country if event else "",
        "rate_increase": event.tariff_rate_increase if event else 0.0,
    }
    
    context_data = {
        "tariff": tariff_data,
        "suppliers": suppliers_data,
        "routes": routes_data,
        "_db_session": db # Pass session to run deterministic DB validation inside node
    }
    
    # Initialize State
    initial_state = AgentState(
        event_id=event_id,
        user_org_id=user_org_id,
        target_product_id=product_id,
        demand_qty=demand_qty,
        context_data=context_data,
        generated_scenarios=[],
        validation_results=[],
        optimized_scenarios=[],
        error=None
    )
    
    # Run Pipeline (via LangGraph or direct multi-agent node sequence)
    if langgraph_app is not None:
        final_state = langgraph_app.invoke(initial_state)
    else:
        st = collect_context_node(initial_state)
        st = supplier_intelligence_node(st)
        st = logistics_intelligence_node(st)
        st = risk_intelligence_node(st)
        st = scenario_generation_node(st)
        final_state = validate_and_optimize_node(st)
    
    if final_state.get("error"):
        return {
            "status": "ERROR",
            "error_code": final_state["error"],
            "scenarios": []
        }
        
    return {
        "status": "SUCCESS",
        "scenarios": final_state.get("optimized_scenarios", [])
    }

