"""
startup.py - SAP BTP Cloud Foundry Startup Script
Prepares database tables and environment before uvicorn starts.
"""

import os
import json
import sys

def configure_hana_from_vcap():
    """
    Extract HANA Cloud connection parameters from VCAP_SERVICES if available.
    """
    vcap_services_raw = os.environ.get("VCAP_SERVICES")
    if not vcap_services_raw:
        print("[startup] VCAP_SERVICES not found - using default DATABASE_URL")
        return

    try:
        vcap = json.loads(vcap_services_raw)
    except Exception as e:
        print(f"[startup] Failed to parse VCAP_SERVICES: {e}", file=sys.stderr)
        return

    hana_services = (
        vcap.get("hana", []) or
        vcap.get("hanatrial", []) or
        vcap.get("hana-cloud", []) or
        vcap.get("hana-cloud-trial", []) or
        []
    )
    if not hana_services:
        print("[startup] No HANA service binding found in VCAP_SERVICES")
        return

    creds = hana_services[0].get("credentials", {})
    host = creds.get("host") or creds.get("hdi_host", "")
    port = creds.get("port") or creds.get("hdi_port", 443)
    user = creds.get("user") or creds.get("hdi_user") or os.environ.get("HANA_USER", "")
    password = creds.get("password") or creds.get("hdi_password") or os.environ.get("HANA_PASSWORD", "")
    schema = creds.get("schema") or creds.get("hdi_schema") or os.environ.get("HANA_SCHEMA", "ARES")

    if host and user and password:
        database_url = f"hana+hdbcli://{user}:{password}@{host}:{port}/?schema={schema}&encrypt=true&sslValidateCertificate=false"
        os.environ["DATABASE_URL"] = database_url
        print(f"[startup] [OK] SAP HANA Cloud configured: {host}:{port} schema={schema}")
    else:
        print("[startup] Notice: Direct credentials not in VCAP_SERVICES, falling back to DATABASE_URL")

def init_tables():
    """Ensure all database tables exist before launching uvicorn."""
    print("[startup] Initializing database tables...")
    try:
        from app.database import engine, Base
        from app import models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        print("[startup] [OK] Database tables verified and ready")
    except Exception as e:
        print(f"[startup] Notice during table verification: {e}", file=sys.stderr)

if __name__ == "__main__":
    print("[startup] Configuring ARES for SAP BTP Cloud Foundry...")
    configure_hana_from_vcap()
    init_tables()
    print("[startup] [OK] Startup complete - starting application server")

