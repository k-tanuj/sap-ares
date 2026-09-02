import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()
def get_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    
    vcap_raw = os.getenv("VCAP_SERVICES")
    if vcap_raw:
        try:
            import json
            vcap = json.loads(vcap_raw)
            hana_services = (
                vcap.get("hana", []) or
                vcap.get("hanatrial", []) or
                vcap.get("hana-cloud", []) or
                vcap.get("hana-cloud-trial", []) or
                []
            )
            if hana_services:
                creds = hana_services[0].get("credentials", {})
                host = creds.get("host") or creds.get("hdi_host", "")
                port = creds.get("port") or creds.get("hdi_port", 443)
                user = creds.get("user") or creds.get("hdi_user") or os.getenv("HANA_USER", "")
                password = creds.get("password") or creds.get("hdi_password") or os.getenv("HANA_PASSWORD", "")
                schema = creds.get("schema") or creds.get("hdi_schema") or os.getenv("HANA_SCHEMA", "ARES")
                if host and user and password:
                    return f"hana+hdbcli://{user}:{password}@{host}:{port}/?schema={schema}&encrypt=true&sslValidateCertificate=false"
        except Exception:
            pass

    return "sqlite:///./ares.db"

class Settings:
    DATABASE_URL: str = get_database_url()
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "20"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "1800"))
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-ares-key-for-jwt-tokens-hackathon-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for convenience
    
    # SAP Configurations
    SAP_HANA_URL: str = os.getenv("SAP_HANA_URL", "")
    SAP_INTEGRATION_URL: str = os.getenv("SAP_INTEGRATION_URL", "")
    SAP_GENAI_URL: str = os.getenv("SAP_GENAI_URL", "")
    SAP_ANALYTICS_URL: str = os.getenv("SAP_ANALYTICS_URL", "")
    SAP_API_KEY: str = os.getenv("SAP_API_KEY", "")
    SAP_HUB_BASE_URL: str = os.getenv("SAP_HUB_BASE_URL", "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap")
    
    # Trade Intelligence Configurations
    USITC_API_BASE_URL: str = os.getenv("USITC_API_BASE_URL", "https://datawebws.usitc.gov/dataweb")
    USITC_API_KEY: str = os.getenv("USITC_API_KEY", "")

    # Toggle mock integrations
    USE_MOCK_SAP: bool = os.getenv("USE_MOCK_SAP", "false").lower() == "true"

settings = Settings()
