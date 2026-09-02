import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models, crud, auth, schemas

client = TestClient(app)

def test_collaborative_negotiation_full_lifecycle():
    """Test scenario negotiation creation, supplier counter-proposal, and E-signature acceptance."""
    db = SessionLocal()
    try:
        # 1. Setup tokens
        buyer_token = auth.create_access_token(data={"sub": "buyer@ares.com", "role": "BUYER_ADMIN", "org": "org-buyer-1"})
        supplier_token = auth.create_access_token(data={"sub": "germany@bavarian.com", "role": "SUPPLIER_ADMIN", "org": "org-supplier-germany"})
        
        buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
        supplier_headers = {"Authorization": f"Bearer {supplier_token}"}

        # 2. Find or create scenario
        scen = db.query(models.Scenario).filter(models.Scenario.feasibility == "FEASIBLE").first()
        assert scen is not None

        # 3. Create a negotiation proposal
        deadline = datetime.datetime.utcnow() + datetime.timedelta(hours=48)
        neg = crud.create_scenario_negotiation(
            db,
            neg=schemas.ScenarioNegotiationCreate(
                scenario_id=scen.id,
                supplier_org_id="org-supplier-germany",
                product_id="MAT-001",
                requested_quantity=5000,
                status="PENDING_SUPPLIER_RESPONSE",
                response_deadline=deadline,
                supplier_comments="Requested 5000 units allocation"
            )
        )
        assert neg.id is not None
        neg_id = neg.id

        # 4. Supplier lists negotiations
        list_res = client.get("/api/suppliers/negotiations", headers=supplier_headers)
        assert list_res.status_code == 200
        negs = list_res.json()
        assert any(n["id"] == neg_id for n in negs)

        # 5. Supplier submits Counter-Proposal
        counter_res = client.post(
            f"/api/suppliers/negotiations/{neg_id}/counter",
            json={
                "proposed_quantity": 3500,
                "proposed_unit_price": 28.5,
                "proposed_lead_time_days": 7,
                "supplier_comments": "Can commit to 3,500 units immediately; line 2 undergoes maintenance."
            },
            headers=supplier_headers
        )
        assert counter_res.status_code == 200
        counter_data = counter_res.json()
        assert counter_data["status"] == "COUNTER_PROPOSED"
        assert counter_data["proposed_quantity"] == 3500

        # 6. Supplier accepts with E-Signature
        accept_res = client.post(
            f"/api/suppliers/negotiations/{neg_id}/accept",
            json={
                "e_signature_name": "Hans Schmidt",
                "e_signature_title": "VP Global Supply Chain",
                "supplier_comments": "Officially confirmed and signed."
            },
            headers=supplier_headers
        )
        assert accept_res.status_code == 200
        accept_data = accept_res.json()
        assert accept_data["status"] == "ACCEPTED"
        assert "Hans Schmidt" in accept_data["e_signature_name"]
        assert accept_data["e_signature_hash"] is not None

        # 7. Buyer views all negotiations for scenario
        buyer_view = client.get(f"/api/scenarios/{scen.id}/negotiations", headers=buyer_headers)
        assert buyer_view.status_code == 200
        assert len(buyer_view.json()) >= 1

    finally:
        db.close()

def test_overdue_negotiation_expiration():
    """Test that overdue negotiations automatically transition to EXPIRED."""
    db = SessionLocal()
    try:
        scen = db.query(models.Scenario).first()
        past_deadline = datetime.datetime.utcnow() - datetime.timedelta(hours=2)
        
        expired_neg = crud.create_scenario_negotiation(
            db,
            neg=schemas.ScenarioNegotiationCreate(
                scenario_id=scen.id,
                supplier_org_id="org-supplier-china",
                product_id="MAT-002",
                requested_quantity=1000,
                status="PENDING_SUPPLIER_RESPONSE",
                response_deadline=past_deadline
            )
        )
        expired_count = crud.expire_overdue_negotiations(db)
        assert expired_count >= 1
        
        db.refresh(expired_neg)
        assert expired_neg.status == "EXPIRED"
    finally:
        db.close()


if __name__ == "__main__":
    test_collaborative_negotiation_full_lifecycle()
    test_overdue_negotiation_expiration()
    print("ALL SUPPLIER COLLABORATION & NEGOTIATION TESTS PASSED!")
