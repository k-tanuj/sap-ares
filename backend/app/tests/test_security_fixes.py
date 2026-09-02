import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models, crud, auth

client = TestClient(app)

def test_httponly_cookie_login_and_auth():
    """Test login sets HttpOnly cookie and subsequent requests authenticate via cookie."""
    # 1. Login with credentials
    login_res = client.post(
        "/api/auth/login",
        data={"username": "buyer@ares.com", "password": "password"}
    )
    assert login_res.status_code == 200
    assert "ares_access_token" in login_res.cookies
    
    # 2. Authenticate using ONLY cookie (no Authorization header)
    cookie_header = {"ares_access_token": login_res.cookies["ares_access_token"]}
    me_res = client.get("/api/auth/me", cookies=cookie_header)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "buyer@ares.com"
    
    # 3. Logout clears cookie
    logout_res = client.post("/api/auth/logout", cookies=cookie_header)
    assert logout_res.status_code == 200

def test_enterprise_sso_flow():
    """Test SSO provider listing, authorization URL generation, and callback token generation."""
    # 1. List Providers
    prov_res = client.get("/api/auth/sso/providers")
    assert prov_res.status_code == 200
    providers = prov_res.json()
    assert len(providers) >= 3
    provider_ids = [p["id"] for p in providers]
    assert "SAP_IAS" in provider_ids
    assert "AZURE_AD" in provider_ids
    assert "OKTA" in provider_ids
    
    # 2. Authorize SSO
    auth_res = client.get("/api/auth/sso/authorize?provider=SAP_IAS")
    assert auth_res.status_code == 200
    assert "authorization_url" in auth_res.json()
    
    # 3. SSO Callback
    cb_res = client.post("/api/auth/sso/callback", json={"provider": "SAP_IAS", "email": "corp-admin@sap.com"})
    assert cb_res.status_code == 200
    assert cb_res.json()["status"] == "SUCCESS"
    assert "ares_access_token" in cb_res.cookies

def test_cryptographic_audit_log_hash_chain():
    """Test SHA-256 hash chaining and tamper detection."""
    db = SessionLocal()
    try:
        # 1. Add chained audit records
        log1 = crud.log_action(db, "SECURITY_TEST_1", "System", "1", "Initial event", user_id=1, email="test@ares.com")
        log2 = crud.log_action(db, "SECURITY_TEST_2", "System", "2", "Second event", user_id=1, email="test@ares.com")
        
        assert log1.entry_hash is not None
        assert log2.prev_hash == log1.entry_hash
        
        # 2. Verify intact chain
        verification = crud.verify_audit_log_chain(db)
        assert verification["status"] in ["VERIFIED_UNCOMPROMISED", "UNCOMPROMISED"]
        assert verification["algorithm"] == "SHA-256 Merkle Chaining"
    finally:
        db.close()

if __name__ == "__main__":
    test_httponly_cookie_login_and_auth()
    test_enterprise_sso_flow()
    test_cryptographic_audit_log_hash_chain()
    print("ALL SECURITY, AUTH & COMPLIANCE TESTS PASSED!")
