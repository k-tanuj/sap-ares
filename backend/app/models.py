from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(100), primary_key=True, index=True) # e.g. "org-buyer-1", "org-supplier-1"
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # "BUYER" or "SUPPLIER"
    onboarding_status = Column(String(50), default="REGISTERED") # REGISTERED, PENDING_VERIFICATION, UNDER_REVIEW, APPROVED, ACTIVE, REJECTED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    users = relationship("User", back_populates="organization")
    facilities = relationship("Facility", back_populates="organization")
    inventory = relationship("Inventory", back_populates="organization")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) # BUYER_ADMIN, BUYER_USER, SUPPLIER_ADMIN, SUPPLIER_USER
    organization_id = Column(String(100), ForeignKey("organizations.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="users")

class SupplierProfile(Base):
    __tablename__ = "supplier_profiles"

    organization_id = Column(String(100), ForeignKey("organizations.id"), primary_key=True)
    address = Column(String(255))
    country = Column(String(100))
    website = Column(String(255))
    contact_name = Column(String(100))
    contact_phone = Column(String(50))
    contact_email = Column(String(255))
    certifications = Column(Text) # comma-separated list
    production_restrictions = Column(Text)

class Facility(Base):
    __tablename__ = "facilities"

    id = Column(String(100), primary_key=True, index=True)
    organization_id = Column(String(100), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255)) # city/country
    latitude = Column(Float)
    longitude = Column(Float)
    type = Column(String(50)) # MANUFACTURING, WAREHOUSE, DISTRIBUTION
    capacity_utilization = Column(Float, default=0.0) # 0 to 100
    emergency_capacity = Column(Float, default=0.0) # units per week
    country = Column(String(100), nullable=True) # Used for origin exposure matching

    organization = relationship("Organization", back_populates="facilities")

class Product(Base):
    __tablename__ = "products"

    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    sku = Column(String(100), unique=True, index=True)
    description = Column(String(500))
    unit_cost = Column(Float, default=0.0)
    lead_time_days = Column(Integer, default=0)
    min_order_qty = Column(Integer, default=0) # MOQ
    hs_code = Column(String(100), nullable=True) # Added for tariff matching

class BuyerSupplierRelationship(Base):
    __tablename__ = "buyer_supplier_relationships"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    buyer_org_id = Column(String(100), ForeignKey("organizations.id"), nullable=False)
    supplier_org_id = Column(String(100), ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    buyer_org = relationship("Organization", foreign_keys=[buyer_org_id])
    supplier_org = relationship("Organization", foreign_keys=[supplier_org_id])

class Inventory(Base):
    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    organization_id = Column(String(100), ForeignKey("organizations.id"), nullable=False)
    product_id = Column(String(100), ForeignKey("products.id"), nullable=False)
    facility_id = Column(String(100), ForeignKey("facilities.id"), nullable=True)
    quantity = Column(Integer, default=0)
    safety_stock = Column(Integer, default=0)
    allocation_limit = Column(Integer, default=0) # max quantity for buyers

    organization = relationship("Organization", back_populates="inventory")
    product = relationship("Product")
    facility = relationship("Facility")

class SupplierCondition(Base):
    __tablename__ = "supplier_conditions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    supplier_org_id = Column(String(100), ForeignKey("organizations.id"), nullable=False)
    product_id = Column(String(100), ForeignKey("products.id"), nullable=False)
    base_price = Column(Float, default=0.0)
    lead_time_days = Column(Integer, default=0)
    moq = Column(Integer, default=0)
    capacity_per_week = Column(Integer, default=0)

    supplier_org = relationship("Organization")
    product = relationship("Product")

class Route(Base):
    __tablename__ = "routes"

    id = Column(String(100), primary_key=True, index=True)
    supplier_org_id = Column(String(100), ForeignKey("organizations.id"), nullable=True) # Optional for global routes, required for supplier-owned
    origin = Column(String(100), nullable=False) # e.g. country or facility code
    destination = Column(String(100), nullable=False)
    mode = Column(String(50), nullable=False) # OCEAN, AIR, ROAD, RAIL
    lead_time_days = Column(Integer, default=0)
    cost_per_unit = Column(Float, default=0.0)
    capacity_limit = Column(Integer, default=0)
    active = Column(Boolean, default=True)

    supplier_org = relationship("Organization")

class TariffEvent(Base):
    __tablename__ = "tariff_events"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title = Column(String(255), nullable=False)
    source_country = Column(String(100), nullable=False)
    destination_country = Column(String(100), nullable=False)
    affected_hscode_categories = Column(String(500), nullable=False) # JSON or comma-separated
    tariff_rate_increase = Column(Float, default=0.0) # e.g. 0.25 for 25%
    effective_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="DETECTED") # DETECTED, VALIDATING, PENDING_REVIEW, CONFIRMED, REJECTED
    source_agency = Column(String(50), default="MANUAL") # CBIC, DGFT, USITC, MANUAL, IMPORT
    reference_id = Column(String(100), nullable=True) # notice or notification identifier
    confidence_score = Column(Float, default=1.0)
    evidence_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TradeSignal(Base):
    __tablename__ = "trade_signals"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title = Column(String(255), nullable=False)
    source_country = Column(String(100), nullable=True)
    destination_country = Column(String(100), nullable=True)
    affected_hscode_categories = Column(String(500), nullable=True)
    signal_type = Column(String(50), nullable=True) # IMPORT, EXPORT, RESTRICTION, DATA
    severity = Column(Float, default=0.0)
    detected_at = Column(DateTime, nullable=False)
    source_agency = Column(String(50), nullable=False) # e.g., USITC
    reference_id = Column(String(100), nullable=True)
    evidence_url = Column(String(500), nullable=True)
    raw_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SupplierConfirmation(Base):
    __tablename__ = "supplier_confirmations"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tariff_event_id = Column(Integer, ForeignKey("tariff_events.id"), nullable=False)
    supplier_org_id = Column(String(100), ForeignKey("organizations.id"), nullable=False)
    status = Column(String(50), default="POTENTIALLY_AFFECTED") # POTENTIALLY_AFFECTED, CONFIRMED_AFFECTED, NOT_AFFECTED
    supplier_notes = Column(Text)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    tariff_event = relationship("TariffEvent")
    supplier_org = relationship("Organization")

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    tariff_event_id = Column(Integer, ForeignKey("tariff_events.id"), nullable=False)
    name = Column(String(255), nullable=False)
    objective = Column(String(50), nullable=False) # CONTINUITY, COST, SPEED, RISK_REDUCTION, DIVERSIFICATION, BALANCED
    action_details = Column(JSON, nullable=False) # JSON list of actions
    status = Column(String(50), default="PENDING_REVIEW") # PENDING_REVIEW, APPROVED, REJECTED
    feasibility = Column(String(50), default="FEASIBLE") # FEASIBLE, INFEASIBLE
    feasibility_notes = Column(Text)
    optimized_cost = Column(Float, default=0.0)
    recovery_time_days = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)
    continuity_percentage = Column(Float, default=0.0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tariff_event = relationship("TariffEvent")
    creator = relationship("User")

class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)
    before_kpi = Column(JSON, nullable=False)
    after_kpi = Column(JSON, nullable=False)
    run_at = Column(DateTime, default=datetime.datetime.utcnow)

    scenario = relationship("Scenario")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    sequence_number = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, nullable=True)
    email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(String(100))
    description = Column(Text)
    prev_hash = Column(String(64), nullable=True)
    entry_hash = Column(String(64), nullable=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class SupplierNotification(Base):
    __tablename__ = "supplier_notifications"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    supplier_org_id = Column(String(100), ForeignKey("organizations.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization")
    scenario = relationship("Scenario")

class ScenarioNegotiation(Base):
    __tablename__ = "scenario_negotiations"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False, index=True)
    supplier_org_id = Column(String(100), ForeignKey("organizations.id"), nullable=False, index=True)
    product_id = Column(String(100), nullable=False)
    requested_quantity = Column(Integer, nullable=False)
    proposed_quantity = Column(Integer, nullable=True)
    proposed_unit_price = Column(Float, nullable=True)
    proposed_lead_time_days = Column(Integer, nullable=True)
    status = Column(String(50), default="PENDING_SUPPLIER_RESPONSE") # PENDING_SUPPLIER_RESPONSE, ACCEPTED, COUNTER_PROPOSED, DECLINED, EXPIRED
    e_signature_name = Column(String(255), nullable=True)
    e_signature_hash = Column(String(64), nullable=True)
    signed_at = Column(DateTime, nullable=True)
    response_deadline = Column(DateTime, nullable=False)
    supplier_comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    scenario = relationship("Scenario")
    organization = relationship("Organization")

