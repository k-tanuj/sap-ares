import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app, seed_database
from app.database import Base, get_db
from app.services.ai_agent import validate_scenario_feasibility
from app import models

from sqlalchemy.pool import StaticPool

# Set up test database (in-memory SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency override
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

# 1. AUTHENTICATION & LOGIN TESTS
def test_login_buyer():
    response = client.post(
        "/api/auth/login",
        data={"username": "buyer@ares.com", "password": "password"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

def test_login_supplier():
    response = client.post(
        "/api/auth/login",
        data={"username": "china@sino.com", "password": "password"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid():
    response = client.post(
        "/api/auth/login",
        data={"username": "buyer@ares.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401

# 2. RBAC & ISOLATION TESTS
def test_buyer_can_list_suppliers():
    # Login as buyer
    buyer_token = client.post(
        "/api/auth/login",
        data={"username": "buyer@ares.com", "password": "password"}
    ).json()["access_token"]
    
    headers = {"Authorization": f"Bearer {buyer_token}"}
    response = client.get("/api/suppliers", headers=headers)
    assert response.status_code == 200
    orgs = response.json()
    assert len(orgs) >= 8 # Verify we see all 8 suppliers

def test_supplier_cannot_list_suppliers():
    # Login as supplier
    supplier_token = client.post(
        "/api/auth/login",
        data={"username": "china@sino.com", "password": "password"}
    ).json()["access_token"]
    
    headers = {"Authorization": f"Bearer {supplier_token}"}
    response = client.get("/api/suppliers", headers=headers)
    assert response.status_code == 403 # Supplier cannot list suppliers

def test_supplier_isolation():
    """
    Supplier A (China) must not access Supplier B's (Germany) inventory or conditions.
    """
    china_token = client.post(
        "/api/auth/login",
        data={"username": "china@sino.com", "password": "password"}
    ).json()["access_token"]
    
    headers = {"Authorization": f"Bearer {china_token}"}
    
    # SinoChip requests inventory
    response = client.get("/api/suppliers/inventory", headers=headers)
    assert response.status_code == 200
    for inv in response.json():
        # Assert each inventory record returned belongs only to SinoChip
        assert inv["organization_id"] == "org-supplier-china"

# 3. ONBOARDING STATUS RESTRICTIONS
def test_pending_supplier_restricted():
    """
    Pending/Registered suppliers must not access trusted operational APIs.
    """
    # Mekong Sourcing (vietnam@mekong.com) is in PENDING_VERIFICATION state.
    vietnam_token = client.post(
        "/api/auth/login",
        data={"username": "vietnam@mekong.com", "password": "password"}
    ).json()["access_token"]
    
    headers = {"Authorization": f"Bearer {vietnam_token}"}
    
    # Try to access operational facilities API
    response = client.get("/api/suppliers/facilities", headers=headers)
    # Should get 403 Forbidden because supplier status is PENDING_VERIFICATION
    assert response.status_code == 403
    assert "Trusted operational portal is restricted" in response.json()["detail"]

# 4. DETERMINISTIC FEASIBILITY VALIDATIONS
def test_deterministic_feasibility_capacity_exceeded():
    db = TestingSessionLocal()
    
    # SinoChip has weekly capacity = 5000 for MAT-001. Let's request 6000.
    actions = [
        {
            "action_type": "INCREASE_ALLOCATION",
            "supplier_org_id": "org-supplier-china",
            "product_id": "MAT-001",
            "quantity": 6000
        }
    ]
    feasible, reason = validate_scenario_feasibility(db, actions)
    assert not feasible
    assert "CAPACITY_EXCEEDED" in reason

def test_deterministic_feasibility_moq_not_met():
    db = TestingSessionLocal()
    
    # SinoChip has MOQ = 1000 for MAT-001. Let's request 500.
    actions = [
        {
            "action_type": "INCREASE_ALLOCATION",
            "supplier_org_id": "org-supplier-china",
            "product_id": "MAT-001",
            "quantity": 500
        }
    ]
    feasible, reason = validate_scenario_feasibility(db, actions)
    assert not feasible
    assert "MOQ_NOT_MET" in reason

def test_deterministic_feasibility_success():
    db = TestingSessionLocal()
    
    # SinoChip: MOQ=1000, Capacity=5000. Let's request 2500.
    actions = [
        {
            "action_type": "INCREASE_ALLOCATION",
            "supplier_org_id": "org-supplier-china",
            "product_id": "MAT-001",
            "quantity": 2500
        }
    ]
    feasible, reason = validate_scenario_feasibility(db, actions)
    assert feasible
    assert reason == "FEASIBLE"
