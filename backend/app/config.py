import os
from dotenv import load_dotenv

load_dotenv()
class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ares.db")
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
    
    # Toggle mock integrations
    USE_MOCK_SAP: bool = os.getenv("USE_MOCK_SAP", "false").lower() == "true"

settings = Settings()
