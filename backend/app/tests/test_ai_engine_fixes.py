import sys
from pathlib import Path

# Add backend directory to sys.path so tests run regardless of execution root
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.services.expert_engine import ExpertResilienceEngine
from app.services.optimizer import optimize_supplier_allocation
from app.services.async_task_manager import create_task, get_task, update_task_progress, complete_task
from app import models, auth

client = TestClient(app)

def test_expert_resilience_engine_dynamic_generation():
    """Test that ExpertResilienceEngine generates multi-objective plans based on database state."""
    db = SessionLocal()
    try:
        event = db.query(models.TariffEvent).first()
        product = db.query(models.Product).first()
        
        if event and product:
            plans = ExpertResilienceEngine.generate_resilience_plans(
                db=db,
                event=event,
                product=product,
                demand_qty=1000,
                affected_supplier_ids=["org-supplier-china"]
            )
            assert isinstance(plans, list)
            assert len(plans) >= 1
            for p in plans:
                assert "name" in p
                assert "objective" in p
                assert "actions" in p
                assert len(p["actions"]) >= 1
    finally:
        db.close()

def test_or_tools_solver_time_limit_and_solution():
    """Test OR-Tools MIP solver with time-limited execution and feasibility checks."""
    suppliers = [
        {"supplier_org_id": "s1", "name": "Vendor A", "capacity": 800, "unit_cost": 10.0, "moq": 100, "risk_score": 20.0, "lead_time_days": 5},
        {"supplier_org_id": "s2", "name": "Vendor B", "capacity": 600, "unit_cost": 14.0, "moq": 50, "risk_score": 10.0, "lead_time_days": 2},
    ]
    
    # Test Cost objective
    res_cost = optimize_supplier_allocation(demand=1000, suppliers=suppliers, objective_type="COST")
    assert res_cost["status"] == "OPTIMAL"
    assert len(res_cost["allocations"]) == 2
    assert sum(a["quantity"] for a in res_cost["allocations"]) == 1000

    # Test Speed objective
    res_speed = optimize_supplier_allocation(demand=500, suppliers=suppliers, objective_type="SPEED")
    assert res_speed["status"] == "OPTIMAL"

def test_async_task_manager_lifecycle():
    """Test task creation, progress tracking, and retrieval."""
    task_id = create_task("TEST_TASK", {"meta": "val"})
    assert task_id.startswith("task_")
    
    t1 = get_task(task_id)
    assert t1["status"] == "PENDING"
    
    update_task_progress(task_id, 50, "Halfway Done")
    t2 = get_task(task_id)
    assert t2["status"] == "RUNNING"
    assert t2["progress"] == 50
    assert t2["stage"] == "Halfway Done"
    
    complete_task(task_id, {"result_key": "success"})
    t3 = get_task(task_id)
    assert t3["status"] == "COMPLETED"
    assert t3["progress"] == 100
    assert t3["result"] == {"result_key": "success"}

from unittest.mock import patch

def test_generate_scenarios_async_endpoint():
    """Test the POST /api/scenarios/generate-async endpoint."""
    token = auth.create_access_token(data={"sub": "buyer@ares.com", "role": "BUYER_ADMIN", "org": "org-buyer-1"})
    headers = {"Authorization": f"Bearer {token}"}
    
    db = SessionLocal()
    event = db.query(models.TariffEvent).first()
    product = db.query(models.Product).first()
    db.close()
    
    if event and product:
        with patch("app.routers.scenarios.run_recovery_scenario_generation", return_value=[]):
            res = client.post(
                f"/api/scenarios/generate-async?event_id={event.id}&product_id={product.id}&demand_qty=500",
                headers=headers
            )
            assert res.status_code == 200
            data = res.json()
            assert "task_id" in data
            assert data["status"] in ["PENDING", "RUNNING", "COMPLETED"]
            
            # Check task status endpoint
            task_res = client.get(f"/api/scenarios/tasks/{data['task_id']}", headers=headers)
            assert task_res.status_code == 200
            assert task_res.json()["task_id"] == data["task_id"]

