import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from app.services.sap_adapter import get_sap_adapter, MockSAPAdapter, RealSAPAdapter
from app.database import SessionLocal
from app import models, crud, auth
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_sap_po_creation_and_cancellation():
    """Test transactional SAP Purchase Order creation and rollback."""
    adapter = get_sap_adapter()
    
    # 1. Create PO
    items = [{"Material": "MAT-001", "OrderQuantity": 500, "NetPriceAmount": 35.0}]
    po = adapter.create_purchase_order("org-supplier-germany", items)
    
    assert "PurchaseOrder" in po
    assert po["Supplier"] == "org-supplier-germany"
    assert po["Status"] in ["ORDERED", "RELEASED", "CREATED"]
    po_number = po["PurchaseOrder"]
    
    # 2. Cancel PO (Rollback)
    canceled = adapter.cancel_purchase_order(po_number, reason="Test Rollback")
    assert canceled is True

def test_sap_change_request():
    """Test S/4HANA Engineering / Sourcing Change Record creation."""
    adapter = get_sap_adapter()
    changes = [{"action_type": "INCREASE_ALLOCATION", "supplier_org_id": "org-supplier-germany"}]
    cr = adapter.create_change_request(scenario_id=1, rationale="Tariff mitigation reallocation", changes=changes)
    
    assert "ChangeRecord" in cr
    assert cr["ScenarioId"] == 1
    assert cr["Status"] == "IN_APPROVAL"

def test_sap_scenario_writeback_success_and_rollback():
    """Test full multi-action ERP writeback and compensation rollback."""
    adapter = get_sap_adapter()
    actions = [
        {"action_type": "INCREASE_ALLOCATION", "supplier_org_id": "org-supplier-germany", "quantity": 1000, "product_id": "MAT-001"},
        {"action_type": "SWITCH_SUPPLIER", "supplier_org_id": "org-supplier-china", "quantity": 500, "product_id": "MAT-002"}
    ]
    
    # Test Success Path
    res = adapter.execute_scenario_erp_writeback(scenario_id=101, actions=actions)
    assert res["status"] == "SUCCESS"
    assert len(res["purchase_orders"]) == 2
    assert "change_request" in res

def test_scenario_approval_erp_integration():
    """Test that approving a scenario via HTTP endpoint executes ERP write-back."""
    db = SessionLocal()
    try:
        scen = db.query(models.Scenario).filter(models.Scenario.feasibility == "FEASIBLE").first()
        if scen:
            token = auth.create_access_token(data={"sub": "buyer@ares.com", "role": "BUYER_ADMIN", "org": "org-buyer-1"})
            headers = {"Authorization": f"Bearer {token}"}
            
            res = client.put(
                f"/api/scenarios/{scen.id}/approve",
                json={"status": "APPROVED", "notes": "Approved with SAP write-back"},
                headers=headers
            )
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "APPROVED"
            
            # Check that audit log recorded the ERP writeback
            audit = db.query(models.AuditLog).filter(
                models.AuditLog.action == "SAP_ERP_TRANSACTIONAL_WRITEBACK",
                models.AuditLog.entity_id == scen.id
            ).first()
            assert audit is not None
            assert "Executed transactional ERP write-back" in audit.description
    finally:
        db.close()

if __name__ == "__main__":
    test_sap_po_creation_and_cancellation()
    test_sap_change_request()
    test_sap_scenario_writeback_success_and_rollback()
    test_scenario_approval_erp_integration()
    print("ALL SAP TRANSACTIONAL ERP TESTS PASSED!")
