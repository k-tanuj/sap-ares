import sys
import json
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

from app.database import SessionLocal
from app import crud, models, schemas
from app.services.sap_adapter import get_sap_adapter
from app.routers.scenarios import run_scenario_simulation

def test_workflow():
    db = SessionLocal()
    try:
        print("1. Fetching a scenario...")
        scen = db.query(models.Scenario).first()
        if not scen:
            print("No scenario found in DB to test. Creating one...")
            # We can create a dummy scenario
            scen = models.Scenario(
                tariff_event_id=1,
                name="Test Fallback Scenario",
                objective="BALANCED",
                action_details=[{
                    "action_type": "INCREASE_ALLOCATION",
                    "supplier_org_id": "org-supplier-1",
                    "product_id": "PROD-ELEC-01",
                    "quantity": 500,
                    "cost_impact": 1000.0
                }],
                status="PENDING_REVIEW",
                feasibility="FEASIBLE"
            )
            db.add(scen)
            db.commit()
            db.refresh(scen)
            
        print(f"Testing with Scenario {scen.id}: {scen.name}")
        print("2. Simulating approval logic...")
        
        # This mirrors the logic in routers/scenarios.py:approve_scenario
        
        # 2a. Update status
        updated_scen = crud.update_scenario_status(
            db, 
            scenario_id=scen.id, 
            status="APPROVED", 
            auditor_email="test@buyer.com", 
            auditor_id=1
        )
        print("Status updated to:", updated_scen.status)

        # 2b. Trigger Simulation
        sim_data = run_scenario_simulation(db, updated_scen)
        sim = crud.create_simulation_result(
            db, 
            scenario_id=scen.id, 
            before_kpi=sim_data["before_kpi"], 
            after_kpi=sim_data["after_kpi"]
        )
        print("Simulation result created:", sim.id)

        # 2c. SAP Sync
        sap = get_sap_adapter()
        sap_payload = []
        for act in updated_scen.action_details:
            sap_payload.append({
                "ScenarioId": scen.id,
                "ActionType": act.get("action_type"),
                "Product": act.get("product_id"),
                "Supplier": act.get("supplier_org_id"),
                "Quantity": act.get("quantity"),
                "Route": act.get("route_id")
            })
        
        sync_result = sap.sync_to_sap_analytics("ScenarioApprovals", sap_payload)
        print("SAP Sync Result:", sync_result)

        # 2d. Supplier Notification
        notified_suppliers = set()
        for act in updated_scen.action_details:
            supplier_id = act.get("supplier_org_id")
            if supplier_id and supplier_id not in notified_suppliers:
                notified_suppliers.add(supplier_id)
                notif = crud.create_supplier_notification(
                    db,
                    schemas.SupplierNotificationCreate(
                        supplier_org_id=supplier_id,
                        title="Recovery Plan Approved",
                        message=f"Buyer approved a recovery plan involving your organization.",
                        scenario_id=scen.id
                    )
                )
                print(f"Created notification for supplier {supplier_id}: {notif.id}")

        print("Workflow test completed successfully!")
    except Exception as e:
        print("Error during test:", e)
    finally:
        db.close()

if __name__ == "__main__":
    test_workflow()
