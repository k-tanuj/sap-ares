from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# Organization
class OrganizationBase(BaseModel):
    id: str
    name: str
    type: str # BUYER, SUPPLIER
    onboarding_status: str = "REGISTERED"

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationResponse(OrganizationBase):
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# User
class UserBase(BaseModel):
    email: EmailStr
    role: str # BUYER_ADMIN, BUYER_USER, SUPPLIER_ADMIN, SUPPLIER_USER
    organization_id: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    organization_id: Optional[str] = None

# Supplier Profile
class SupplierProfileBase(BaseModel):
    address: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    certifications: Optional[str] = None
    production_restrictions: Optional[str] = None

class SupplierProfileCreate(SupplierProfileBase):
    organization_id: str

class SupplierProfileResponse(SupplierProfileBase):
    organization_id: str

    class Config:
        from_attributes = True

# Facility
class FacilityBase(BaseModel):
    id: str
    name: str
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    type: str # MANUFACTURING, WAREHOUSE, DISTRIBUTION
    capacity_utilization: float = 0.0
    emergency_capacity: float = 0.0

class FacilityCreate(FacilityBase):
    organization_id: str

class FacilityResponse(FacilityBase):
    organization_id: str

    class Config:
        from_attributes = True

# Product
class ProductBase(BaseModel):
    id: str
    name: str
    sku: str
    description: Optional[str] = None
    unit_cost: float = 0.0
    lead_time_days: int = 0
    min_order_qty: int = 0

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    class Config:
        from_attributes = True

# Inventory
class InventoryBase(BaseModel):
    product_id: str
    facility_id: Optional[str] = None
    quantity: int = 0
    safety_stock: int = 0
    allocation_limit: int = 0

class InventoryCreate(InventoryBase):
    organization_id: str

class InventoryResponse(InventoryBase):
    id: int
    organization_id: str
    product: Optional[ProductResponse] = None
    facility: Optional[FacilityResponse] = None

    class Config:
        from_attributes = True

# Supplier Condition
class SupplierConditionBase(BaseModel):
    product_id: str
    base_price: float = 0.0
    lead_time_days: int = 0
    moq: int = 0
    capacity_per_week: int = 0

class SupplierConditionCreate(SupplierConditionBase):
    supplier_org_id: str

class SupplierConditionResponse(SupplierConditionBase):
    id: int
    supplier_org_id: str
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True

# Route
class RouteBase(BaseModel):
    id: str
    origin: str
    destination: str
    mode: str # OCEAN, AIR, ROAD, RAIL
    lead_time_days: int = 0
    cost_per_unit: float = 0.0
    capacity_limit: int = 0
    active: bool = True

class RouteCreate(RouteBase):
    pass

class RouteResponse(RouteBase):
    class Config:
        from_attributes = True

# Tariff Event
class TariffEventBase(BaseModel):
    title: str
    source_country: str
    destination_country: str
    affected_hscode_categories: str
    tariff_rate_increase: float
    effective_date: datetime

class TariffEventCreate(TariffEventBase):
    source_agency: str = "MANUAL" # CBIC, DGFT, MANUAL, IMPORT
    reference_id: Optional[str] = None
    confidence_score: float = 1.0
    evidence_url: Optional[str] = None

class TariffEventResponse(TariffEventBase):
    id: int
    status: str # DETECTED, VALIDATING, PENDING_REVIEW, CONFIRMED, REJECTED
    source_agency: str
    reference_id: Optional[str] = None
    confidence_score: float = 1.0
    evidence_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TariffEventUpdateStatus(BaseModel):
    status: str

# Trade Signal
class TradeSignalBase(BaseModel):
    title: str
    source_country: Optional[str] = None
    destination_country: Optional[str] = None
    affected_hscode_categories: Optional[str] = None
    signal_type: Optional[str] = None
    severity: float = 0.0
    detected_at: datetime
    source_agency: str
    reference_id: Optional[str] = None
    evidence_url: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None

class TradeSignalCreate(TradeSignalBase):
    pass

class TradeSignalResponse(TradeSignalBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Supplier Confirmation
class SupplierConfirmationBase(BaseModel):
    tariff_event_id: int
    status: str # POTENTIALLY_AFFECTED, CONFIRMED_AFFECTED, NOT_AFFECTED
    supplier_notes: Optional[str] = None

class SupplierConfirmationCreate(SupplierConfirmationBase):
    supplier_org_id: str

class SupplierConfirmationUpdate(BaseModel):
    status: str
    supplier_notes: Optional[str] = None

class SupplierConfirmationResponse(SupplierConfirmationBase):
    id: int
    supplier_org_id: str
    updated_at: datetime
    tariff_event: Optional[TariffEventResponse] = None
    supplier_org: Optional[OrganizationResponse] = None

    class Config:
        from_attributes = True

# Action Detail for Scenario
class ScenarioAction(BaseModel):
    action_type: str # INCREASE_ALLOCATION, SWITCH_SUPPLIER, USE_INVENTORY, CHANGE_ROUTE, SHIFT_PRODUCTION
    supplier_org_id: Optional[str] = None
    product_id: Optional[str] = None
    quantity: Optional[int] = None
    route_id: Optional[str] = None
    facility_id: Optional[str] = None
    cost_impact: float = 0.0

# Scenario
class ScenarioBase(BaseModel):
    tariff_event_id: int
    name: str
    objective: str # CONTINUITY, COST, SPEED, RISK_REDUCTION, DIVERSIFICATION, BALANCED
    action_details: List[ScenarioAction]

class ScenarioCreate(ScenarioBase):
    pass

class ScenarioResponse(ScenarioBase):
    id: int
    status: str # PENDING_REVIEW, APPROVED, REJECTED
    feasibility: str # FEASIBLE, INFEASIBLE
    feasibility_notes: Optional[str] = None
    optimized_cost: float
    recovery_time_days: int
    risk_score: float
    continuity_percentage: float
    created_by: Optional[int] = None
    created_at: datetime
    tariff_event: Optional[TariffEventResponse] = None

    class Config:
        from_attributes = True

class ScenarioApproval(BaseModel):
    status: str # APPROVED, REJECTED

# Simulation
class SimulationResponse(BaseModel):
    scenario_id: int
    before_kpi: Dict[str, Any]
    after_kpi: Dict[str, Any]
    run_at: datetime

    class Config:
        from_attributes = True

# Audit Log
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    email: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    description: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
