# 🏢 ARES — Comprehensive SAP Technology Integration Guide

This guide provides technical steps, architectural blueprints, authentication requirements, and code samples for integrating each SAP technology into the **ARES** (Automated Resiliency & Exposure System) platform.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ARES CORE PLATFORM                            │
└──────────────┬──────────────────┬─────────────────┬─────────────────────┘
               │                  │                 │                     │
               ▼                  ▼                 ▼                     ▼
       ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      ┌──────────────┐
       │   SAP BTP    │   │  SAP GenAI   │   │  SAP S/4HANA │      │ SAP Analytics│
       │ Integration  │   │     Hub      │   │  / HANA Cloud│      │    Cloud     │
       │    Suite     │   │              │   │   (OData)    │      │    (SAC)     │
       └──────────────┘   └──────────────┘   └──────────────┘      └──────────────┘
```

---

## 1. 🤖 SAP Generative AI Hub (BTP AI Core)

### **Purpose in ARES:**
Powers the **Multi-Agent Orchestrator** (`ai_agent.py`) and the **Trade Normalization Engine** (`normalize_via_llm`). It converts unstructured legal text (CBIC/DGFT gazettes, USITC trade alerts) into structured JSON entities and coordinates the Supplier, Logistics, and Risk agents.

### **Step-by-Step Setup:**

#### **Step 1.1: Service Key in SAP BTP Cockpit**
1. Open **SAP BTP Cockpit** → Navigate to your **Subaccount** → **Instances and Subscriptions**.
2. Create an instance of **SAP AI Core** (service: `aicore`, plan: `extended`).
3. Under the instance, create a **Service Key** named `ares-genai-key`.
4. Download the JSON credential file containing:
   - `clientid`
   - `clientsecret`
   - `serviceurls.AI_API_URL`
   - `url` (Authentication token endpoint)

#### **Step 1.2: Model Deployment in SAP AI Launchpad**
1. Open **SAP AI Launchpad** → **Generative AI Hub** → **Deployments**.
2. Deploy a foundation model (e.g., `gpt-4o` or `gpt-4-32k` / `anthropic--claude-3.5-sonnet`).
3. Note the **Deployment ID** (e.g., `d123456789abcdef`).

#### **Step 1.3: Python Client Implementation (`backend/app/services/sap_genai.py`)**
```python
import httpx
import os
from typing import Dict, Any

class SAPGenAIHubClient:
    def __init__(self):
        self.auth_url = os.getenv("SAP_GENAI_AUTH_URL")
        self.client_id = os.getenv("SAP_GENAI_CLIENT_ID")
        self.client_secret = os.getenv("SAP_GENAI_CLIENT_SECRET")
        self.api_base = os.getenv("SAP_GENAI_API_URL")
        self.deployment_id = os.getenv("SAP_GENAI_DEPLOYMENT_ID")
        self.token = None

    def _get_token(self) -> str:
        """Fetch OAuth2 Bearer token from SAP BTP UAA."""
        res = httpx.post(
            self.auth_url,
            data={"grant_type": "client_credentials"},
            auth=(self.client_id, self.client_secret),
            timeout=10.0
        )
        res.raise_for_status()
        return res.json()["access_token"]

    def generate_completion(self, system_prompt: str, user_prompt: str) -> str:
        """Send prompt to the deployed model via SAP Generative AI Hub."""
        if not self.token:
            self.token = self._get_token()

        url = f"{self.api_base}/v2/inference/deployments/{self.deployment_id}/chat/completions?api-version=2024-02-01"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "AI-Resource-Group": "default",
            "Content-Type": "application/json"
        }
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 401:  # Token expired
                self.token = self._get_token()
                headers["Authorization"] = f"Bearer {self.token}"
                resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
```

---

## 2. 📦 SAP S/4HANA & SAP HANA Cloud (OData & Master Data)

### **Purpose in ARES:**
Fetches live enterprise master data:
- **Materials & Bills of Material (BOM):** `API_PRODUCT_SRV`
- **Purchase Orders (POs):** `API_PURCHASEORDER_PROCESS_SRV`
- **Business Partner / Supplier Records:** `API_BUSINESS_PARTNER`
- **Purchase Order Auto-Creation:** Writes approved mitigation re-allocation decisions back to SAP S/4HANA.

### **Step-by-Step Setup:**

#### **Step 2.1: Enable Standard APIs in SAP S/4HANA**
Ensure the following standard OData v2/v4 services are active in transaction `/n/IWFND/MAINT_SERVICE` (or via SAP Business Accelerator Hub):
1. `API_BUSINESS_PARTNER`
2. `API_PRODUCT_SRV`
3. `API_PURCHASEORDER_PROCESS_SRV`

#### **Step 2.2: Python Client Implementation (`backend/app/services/sap_s4hana.py`)**
```python
import httpx
import os
from typing import List, Dict, Any

class SAPS4HANAClient:
    def __init__(self):
        self.base_url = os.getenv("SAP_S4HANA_BASE_URL", "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap")
        self.api_key = os.getenv("SAP_API_HUB_KEY") # For Sandbox or Basic Auth for live S/4HANA
        self.username = os.getenv("SAP_S4HANA_USER")
        self.password = os.getenv("SAP_S4HANA_PASSWORD")

    def _headers(self, csrf_token: str = None) -> dict:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["APIKey"] = self.api_key
        if csrf_token:
            headers["x-csrf-token"] = csrf_token
        return headers

    def get_materials(self) -> List[Dict[str, Any]]:
        """Fetch product list from S/4HANA."""
        url = f"{self.base_url}/API_PRODUCT_SRV/A_Product?$top=50&$select=Product,ProductType,BaseUnit"
        with httpx.Client(timeout=15.0) as client:
            auth = (self.username, self.password) if self.username else None
            res = client.get(url, headers=self._headers(), auth=auth)
            res.raise_for_status()
            return res.json().get("d", {}).get("results", [])

    def create_purchase_order(self, supplier_id: str, material_id: str, quantity: int, net_price: float) -> str:
        """
        Creates a Purchase Order in SAP S/4HANA once a scenario is APPROVED.
        Requires CSRF token fetch first.
        """
        with httpx.Client(timeout=15.0) as client:
            auth = (self.username, self.password) if self.username else None
            
            # 1. Fetch CSRF token
            token_res = client.get(
                f"{self.base_url}/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder?$top=1",
                headers={"x-csrf-token": "Fetch"},
                auth=auth
            )
            csrf_token = token_res.headers.get("x-csrf-token")
            cookies = token_res.cookies

            # 2. Post Purchase Order
            payload = {
                "PurchaseOrderType": "NB",
                "Supplier": supplier_id,
                "Language": "EN",
                "PurchasingOrganization": "1010",
                "PurchasingGroup": "001",
                "CompanyCode": "1010",
                "to_PurchaseOrderItem": {
                    "results": [
                        {
                            "PurchaseOrderItem": "10",
                            "Material": material_id,
                            "OrderQuantity": str(quantity),
                            "NetPriceAmount": str(net_price)
                        }
                    ]
                }
            }
            
            po_res = client.post(
                f"{self.base_url}/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder",
                headers=self._headers(csrf_token=csrf_token),
                cookies=cookies,
                json=payload,
                auth=auth
            )
            po_res.raise_for_status()
            return po_res.json()["d"]["PurchaseOrder"]
```

---

## 3. 🌐 SAP Integration Suite (Cloud Integration / CPI)

### **Purpose in ARES:**
Provides the secure enterprise gateway between external data feeds (CBIC, DGFT, USITC) and the internal SAP landscape, managing transformations, rate limits, and guaranteed delivery.

### **Step-by-Step Setup:**

#### **Step 3.1: Build an iFlow in SAP Cloud Integration**
1. Open **SAP Integration Suite** → **Design** → **Create Integration Package** (`ARES_Trade_Integrations`).
2. Create an **Integration Flow (iFlow)** named `Ingest_Trade_Disruptions`:
   - **Sender:** HTTPS Adapter (Endpoint: `/ares/v1/trade-events`).
   - **Content Modifier:** Extract and validate incoming payload headers.
   - **Script / Groovy Step:** Enrich event with SAP internal master data mapping.
   - **Receiver:** HTTP Adapter routing to ARES Backend `/api/trade/ingest` or SAP S/4HANA.

#### **Step 3.2: Python Trigger Implementation (`backend/app/services/sap_cpi.py`)**
```python
import httpx
import os

def push_event_to_sap_integration_suite(event_data: dict) -> bool:
    """Send normalized disruption event through SAP CPI iFlow."""
    cpi_endpoint = os.getenv("SAP_INTEGRATION_URL")
    cpi_user = os.getenv("SAP_CPI_USER")
    cpi_password = os.getenv("SAP_CPI_PASSWORD")

    if not cpi_endpoint:
        return False

    with httpx.Client(timeout=10.0) as client:
        res = client.post(
            cpi_endpoint,
            json=event_data,
            auth=(cpi_user, cpi_password)
        )
        return res.status_code in [200, 201, 202]
```

---

## 4. 📊 SAP Analytics Cloud (SAC Data Import API)

### **Purpose in ARES:**
Pushes the final optimized supply network scenarios and mathematical KPIs (Continuity %, Sourcing Cost Delta, Lead Time Shifts, Risk Index) directly into **SAP Analytics Cloud Data Import API** for executive dashboards.

### **Step-by-Step Setup:**

#### **Step 4.1: Register OAuth Client in SAP Analytics Cloud**
1. In SAC: **System** → **Administration** → **App Integration**.
2. Under **OAuth Clients**, add a new client:
   - Purpose: **Interactive & Two-legged OAuth**.
   - Scope: **Data Import API** (`Dataset:Write`, `Story:Read`).
3. Copy the **Token URL**, **Client ID**, and **Client Secret**.

#### **Step 4.2: SAC Data Push Implementation (`backend/app/services/sap_sac.py`)**
```python
import httpx
import os
from typing import List, Dict, Any

class SAPAnalyticsCloudClient:
    def __init__(self):
        self.token_url = os.getenv("SAP_SAC_TOKEN_URL")
        self.client_id = os.getenv("SAP_SAC_CLIENT_ID")
        self.client_secret = os.getenv("SAP_SAC_CLIENT_SECRET")
        self.data_api_url = os.getenv("SAP_SAC_DATA_URL")

    def _get_token(self) -> str:
        res = httpx.post(
            self.token_url,
            data={"grant_type": "client_credentials"},
            auth=(self.client_id, self.client_secret),
            timeout=10.0
        )
        res.raise_for_status()
        return res.json()["access_token"]

    def sync_scenarios_to_sac(self, scenario_data: List[Dict[str, Any]]) -> bool:
        """Push scenario metrics to SAC dataset."""
        if not self.token_url:
            print("[SAP SAC] Mock mode: credentials not provided.")
            return True

        token = self._get_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        rows = [
            {
                "ScenarioID": str(s["id"]),
                "ScenarioName": s["name"],
                "OptimizedCost": float(s["optimized_cost"]),
                "RecoveryDays": int(s["recovery_time_days"]),
                "RiskScore": float(s["risk_score"]),
                "ContinuityPercent": float(s["continuity_percentage"]),
                "Status": s["status"]
            }
            for s in scenario_data
        ]

        with httpx.Client(timeout=15.0) as client:
            res = client.post(f"{self.data_api_url}/jobs", headers=headers, json={"Data": rows})
            return res.status_code in [200, 201]
```

---

## 5. 🔑 Environment Configuration (`backend/.env`)

When ready to connect to real SAP instances, configure your `backend/.env` file:

```ini
# ==========================================
# SAP GENERATIVE AI HUB (AI Core)
# ==========================================
SAP_GENAI_AUTH_URL=https://<subaccount>.authentication.eu10.hana.ondemand.com/oauth/token
SAP_GENAI_CLIENT_ID=sb-aicore-instance-xxx
SAP_GENAI_CLIENT_SECRET=xxx-xxx-xxx==
SAP_GENAI_API_URL=https://api.ai.prod.eu-central-1.aws.ml.hana.ondemand.com
SAP_GENAI_DEPLOYMENT_ID=d123456789abcdef

# ==========================================
# SAP S/4HANA / SAP HANA CLOUD (OData)
# ==========================================
SAP_S4HANA_BASE_URL=https://my-s4hana-tenant.s4hana.ondemand.com/sap/opu/odata/sap
SAP_S4HANA_USER=ARES_SERVICE_USER
SAP_S4HANA_PASSWORD=Password123!
# Or for SAP Business Accelerator Hub Sandbox:
SAP_API_HUB_KEY=your_sap_api_hub_sandbox_key

# ==========================================
# SAP INTEGRATION SUITE (CPI)
# ==========================================
SAP_INTEGRATION_URL=https://<tenant>.it-cpi001.cfapps.eu10.hana.ondemand.com/http/ares/v1/trade-events
SAP_CPI_USER=cpi_service_user
SAP_CPI_PASSWORD=Password123!

# ==========================================
# SAP ANALYTICS CLOUD (SAC)
# ==========================================
SAP_SAC_TOKEN_URL=https://<tenant>.authentication.eu10.hana.ondemand.com/oauth/token
SAP_SAC_CLIENT_ID=sac-oauth-client-id
SAP_SAC_CLIENT_SECRET=sac-oauth-client-secret
SAP_SAC_DATA_URL=https://<tenant>.analytics.saphana.ondemand.com/api/v1/dataimport/models/<MODEL_ID>

# ==========================================
# INTEGRATION MODE TOGGLE
# ==========================================
USE_MOCK_SAP=false
```
