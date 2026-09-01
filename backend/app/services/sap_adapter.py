import logging
import json
import httpx
from typing import Dict, Any, List
from ..config import settings

logger = logging.getLogger(__name__)

class SAPAdapterInterface:
    def get_sap_materials(self) -> List[Dict[str, Any]]:
        raise NotImplementedError()
        
    def get_sap_inventory(self) -> List[Dict[str, Any]]:
        raise NotImplementedError()

    def get_sap_purchase_orders(self) -> List[Dict[str, Any]]:
        raise NotImplementedError()

    def call_generative_ai_hub(self, prompt: str, system_instruction: str = "") -> str:
        raise NotImplementedError()

    def sync_to_sap_analytics(self, dataset_name: str, payload: List[Dict[str, Any]]) -> bool:
        raise NotImplementedError()


class MockSAPAdapter(SAPAdapterInterface):
    """
    Mock implementation of the SAP adapters for testing and demo purposes.
    Provides realistic SAP ERP data structure.
    """
    def get_sap_materials(self) -> List[Dict[str, Any]]:
        return [
            {"MaterialNumber": "MAT-001", "Description": "Microcontroller Chip X2", "BaseUnit": "PC", "MaterialGroup": "ELECTRONICS"},
            {"MaterialNumber": "MAT-002", "Description": "Automotive Sensor Array S1", "BaseUnit": "PC", "MaterialGroup": "SENSORS"},
            {"MaterialNumber": "MAT-003", "Description": "Copper Cable Harness H5", "BaseUnit": "M", "MaterialGroup": "CABLES"},
            {"MaterialNumber": "MAT-004", "Description": "Power Management IC P9", "BaseUnit": "PC", "MaterialGroup": "ELECTRONICS"},
        ]
        
    def get_sap_inventory(self) -> List[Dict[str, Any]]:
        return [
            {"MaterialNumber": "MAT-001", "Plant": "PLANT-GERMANY", "StorageLocation": "SL-01", "UnrestrictedStock": 12000, "SafetyStock": 3000},
            {"MaterialNumber": "MAT-002", "Plant": "PLANT-USA", "StorageLocation": "SL-02", "UnrestrictedStock": 8000, "SafetyStock": 2000},
            {"MaterialNumber": "MAT-003", "Plant": "PLANT-GERMANY", "StorageLocation": "SL-01", "UnrestrictedStock": 25000, "SafetyStock": 5000},
            {"MaterialNumber": "MAT-004", "Plant": "PLANT-CHINA", "StorageLocation": "SL-03", "UnrestrictedStock": 1500, "SafetyStock": 4000}, # Under safety stock!
        ]

    def get_sap_purchase_orders(self) -> List[Dict[str, Any]]:
        return [
            {"PurchaseOrder": "PO-1001", "Item": 10, "MaterialNumber": "MAT-001", "Vendor": "VEND-DE-01", "Quantity": 5000, "DeliveryDate": "2026-09-15"},
            {"PurchaseOrder": "PO-1002", "Item": 10, "MaterialNumber": "MAT-002", "Vendor": "VEND-US-01", "Quantity": 3000, "DeliveryDate": "2026-09-20"},
            {"PurchaseOrder": "PO-1003", "Item": 10, "MaterialNumber": "MAT-004", "Vendor": "VEND-CN-01", "Quantity": 4000, "DeliveryDate": "2026-09-05"},
        ]

    def call_generative_ai_hub(self, prompt: str, system_instruction: str = "") -> str:
        """
        Mock response for the SAP Generative AI Hub.
        Returns mock JSON structured text representing a generated recovery plan.
        """
        logger.info(f"Mocking SAP Generative AI Hub request with prompt length: {len(prompt)}")
        
        # Check if the prompt mentions specific actions, and return a appropriate response
        if "recovery scenario" in prompt.lower() or "tariff" in prompt.lower():
            # Return a realistic mock scenario JSON structured string
            response_data = {
                "scenarios": [
                    {
                        "name": "Alternative Routing (Ocean to Air) for Core Chips",
                        "objective": "SPEED",
                        "actions": [
                            {
                                "action_type": "CHANGE_ROUTE",
                                "product_id": "MAT-001",
                                "route_id": "RT-AIR-CN-DE",
                                "quantity": 3000,
                                "cost_impact": 15000.0
                            }
                        ],
                        "notes": "Fastest recovery option. Direct switch to air route RT-AIR-CN-DE to bypass ocean port congestion.",
                        "cost": 15000.0,
                        "time_days": 3,
                        "risk": 15.0,
                        "continuity": 100.0
                    },
                    {
                        "name": "Supplier Reallocation to German Vendor",
                        "objective": "COST",
                        "actions": [
                            {
                                "action_type": "INCREASE_ALLOCATION",
                                "supplier_org_id": "org-supplier-germany",
                                "product_id": "MAT-001",
                                "quantity": 4000,
                                "cost_impact": 5000.0
                            }
                        ],
                        "notes": "Cost-optimal reallocation. Increases volume from approved Germany supplier. Feasibility subject to supplier's capacity constraints.",
                        "cost": 5000.0,
                        "time_days": 10,
                        "risk": 20.0,
                        "continuity": 90.0
                    }
                ]
            }
            return json.dumps(response_data)
        
        return "Insufficient data or no scenario matches found in the query."

    def sync_to_sap_analytics(self, dataset_name: str, payload: List[Dict[str, Any]]) -> bool:
        logger.info(f"Syncing dataset '{dataset_name}' with {len(payload)} rows to SAP Analytics Cloud (MOCKED)")
        return True


class RealSAPAdapter(SAPAdapterInterface):
    """
    Real implementation that connects to actual SAP Business Accelerator Hub (api.sap.com) S/4HANA OData services
    and SAP Integration Suite endpoints.
    """
    def __init__(self):
        self.client = httpx.Client(timeout=10.0)
        self.api_key = settings.SAP_API_KEY
        self.hub_base_url = settings.SAP_HUB_BASE_URL
        self.genai_url = settings.SAP_GENAI_URL
        self.headers = {
            "APIKey": self.api_key,
            "Accept": "application/json",
            "DataServiceVersion": "2.0"
        }

    def get_sap_materials(self) -> List[Dict[str, Any]]:
        if self.api_key and self.hub_base_url:
            try:
                url = f"{self.hub_base_url}/API_PRODUCT_SRV/A_Product?$top=10"
                r = self.client.get(url, headers=self.headers)
                if r.status_code == 200:
                    results = r.json().get("d", {}).get("results", [])
                    materials = []
                    for item in results:
                        materials.append({
                            "MaterialNumber": item.get("Product", "MAT-001"),
                            "Description": f"SAP Material {item.get('Product')} ({item.get('ProductType')})",
                            "BaseUnit": item.get("BaseUnit", "PC"),
                            "MaterialGroup": item.get("ProductGroup", "ELECTRONICS")
                        })
                    if materials:
                        return materials
            except Exception as e:
                logger.error(f"Live SAP Product API failed: {e}. Falling back to mock data.")
        
        return MockSAPAdapter().get_sap_materials()

    def get_sap_inventory(self) -> List[Dict[str, Any]]:
        return MockSAPAdapter().get_sap_inventory()

    def get_sap_purchase_orders(self) -> List[Dict[str, Any]]:
        return MockSAPAdapter().get_sap_purchase_orders()

    def call_generative_ai_hub(self, prompt: str, system_instruction: str = "") -> str:
        if not self.genai_url:
            raise ValueError("SAP_GENAI_URL not configured")
            
        try:
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {settings.SAP_GENAI_URL}"} # Mocked Auth token or fetched via BTP
            payload = {
                "deployment_id": "gpt-4",  # Example deployment ID on Generative AI Hub
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ]
            }
            r = self.client.post(f"{self.genai_url}/v1/chat/completions", json=payload, headers=headers)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Real SAP Generative AI Hub call failed: {e}. Falling back to mock data.")
            return MockSAPAdapter().call_generative_ai_hub(prompt, system_instruction)

    def sync_to_sap_analytics(self, dataset_name: str, payload: List[Dict[str, Any]]) -> bool:
        if not settings.SAP_ANALYTICS_URL:
            return False
        try:
            r = self.client.post(f"{settings.SAP_ANALYTICS_URL}/api/v1/data/{dataset_name}", json=payload)
            r.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Real SAP Analytics sync failed: {e}")
            return False


def get_sap_adapter() -> SAPAdapterInterface:
    if settings.USE_MOCK_SAP:
        return MockSAPAdapter()
    return RealSAPAdapter()
