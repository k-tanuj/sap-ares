# ARES Master SRD v4.0
## Autonomous Resilience & Enterprise Supply Chain

**Purpose:** Consolidated source of truth for ARES product, development, AI, SAP, security, supplier, trade-event, scenario, simulation and analytics requirements.

### Locked stack
- Next.js + React + TypeScript
- Tailwind CSS + shadcn/ui
- Recharts + React Flow
- Python + FastAPI
- Pydantic + SQLAlchemy + Alembic
- PostgreSQL
- SAP HANA Cloud
- SAP Integration Suite
- SAP Generative AI Hub
- SAP Analytics Cloud
- LangGraph
- Google OR-Tools
- Celery + Redis
- MinIO/S3-compatible storage
- Pytest + Vitest + Playwright
- Docker Compose

### Core flow
`Supplier Registration → Buyer Verification → Supplier Portal → Supply Network → Trade/Tariff Event → Human Review → Potential Exposure → Supplier Confirmation → Risk/Impact → AI Intelligence → Dynamic Scenarios → Deterministic Feasibility → OR-Tools → Human Approval → Simulation → Analytics`

### Supplier
Every supplier has separate credentials and organization isolation. Registration does not equal approval.

`REGISTERED → PENDING_VERIFICATION → UNDER_REVIEW → APPROVED → ACTIVE`

Buyer may approve, reject or request changes. Supplier portal contains company, facilities, products, inventory, capacity, routes, shipments, disruptions and documents.

Supplier conditions such as capacity, MOQ, lead time, allocation limits, route restrictions, certifications and production restrictions must affect scenario feasibility.

### India-focused trade detection
Primary official sources:
- **CBIC** — customs notifications, tariff/duty changes, exemptions.
- **ICEGATE** — Indian Customs trade/customs data and services where required access/API capability is available.
- **DGFT** — import/export policy changes, notifications and trade notices.

Supporting inputs:
- Manual buyer event entry.
- Imported CSV/Excel/document event data.

Pipeline:

`CBIC / ICEGATE / DGFT / Manual / Import → Adapter → Normalize → TariffEvent → Validate → Human Review → Confirm/Reject`

Do not assume every source has a freely accessible real-time API. Use adapters and mocks when access is unavailable.

### Risk
ARES distinguishes `POTENTIALLY_AFFECTED` from `CONFIRMED_AFFECTED`. Supplier responses can confirm or deny actual exposure.

### AI
LangGraph orchestrates controlled agents:
- Supplier Intelligence
- Inventory Intelligence
- Logistics Intelligence
- Finance Intelligence
- Compliance Intelligence
- Scenario Agent

AI uses authorization-aware tools and structured outputs. It must never invent suppliers, inventory, capacity, routes, tariffs, costs, lead times, certifications, shipments or SAP records.

Missing required facts → `INSUFFICIENT_DATA`.

### Scenarios
Scenarios are dynamic, not fixed repeated plans. They depend on current suppliers, inventory, capacity, routes, tariffs, costs, supplier conditions, objectives and constraints.

Pipeline:

`AI Candidates → Structured Scenarios → Deterministic Feasibility → OR-Tools → Scoring → Deduplication → Ranking → Human Approval`

Infeasible scenarios are not presented as feasible. No feasible solution is a valid outcome.

### SAP
- **HANA Cloud:** SAP/enterprise data layer.
- **Integration Suite:** SAP ↔ ARES integration boundary.
- **Generative AI Hub:** SAP AI/model layer.
- **Analytics Cloud:** enterprise analytics.

PostgreSQL remains ARES operational source of truth.

SAP-specific code uses adapters. If SAP setup is required, the developer agent must stop and provide exact numbered human instructions instead of guessing.

### Ponytail / AI developer agent
Ponytail is development-time tooling only. It can scaffold, code, test, debug, refactor, document and implement adapters. It is not part of the ARES runtime and must not become enterprise truth, bypass authorization, or directly operate SAP without controlled integration.

Execution:
`INSPECT → IMPLEMENT → TEST → FIX → CONTINUE`

### Human-in-the-loop
Required for supplier onboarding, important tariff confirmation and recovery-plan approval.

### Simulation
`Actual State → Snapshot → Simulation State → Apply Approved Scenario → Recalculate KPIs → Before/After`

Simulation cannot silently modify actual state.

### UI
Professional enterprise SaaS. No emojis in product UI. Clean typography, whitespace, cards, subtle borders, restrained shadows, light backgrounds and controlled accent colors.

Buyer:
Overview, Tariff Events, Disruptions, Suppliers, Supply Network, Scenarios, Decisions, Simulation, Analytics, Audit.

Supplier:
Overview, Company, Facilities, Products, Inventory, Capacity, Routes, Shipments, Disruptions, Documents.

### Security
Authentication → RBAC → organization isolation → resource authorization → business rules → data access → audit.

Supplier A cannot access Supplier B. Buyer A cannot access Buyer B. Pending suppliers cannot access trusted operational APIs. Frontend organization IDs cannot bypass authorization.

### 10-day priority
1. Foundation
2. Security
3. Supplier onboarding
4. Supplier portal
5. Network + HANA/Integration Suite
6. India trade events + human review
7. Risk + AI
8. Dynamic scenarios + feasibility + OR-Tools
9. Human approval + simulation + SAC
10. Hardening and demo

### Final rule
Build the simplest correct ARES that demonstrates trusted supplier data, India-focused disruption detection, constrained AI planning, human decisions, SAP integration and measurable simulation.
