# 🏗️ ARES — Comprehensive Technical Architecture Overview

**Automated Risk & Exposure System (ARES)** is an autonomous, self-healing supply chain control plane. It integrates real-time trade/tariff threat detection, multi-agent AI intelligence, deterministic mathematical optimization (Google OR-Tools), and enterprise SAP ecosystems (HANA Cloud, SAP Integration Suite, S/4HANA, SAC).

---

## 1. High-Level System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    NEXT.JS FRONTEND DASHBOARD                                    │
│   • Enterprise Buyer Portal    • Supplier Portal    • React Flow Graph    • Recharts Analytics   │
└────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │ HTTP / REST / WebSockets (JWT Auth)
                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      FASTAPI BACKEND SERVICE                                     │
│  ┌───────────────────────┐   ┌───────────────────────┐   ┌────────────────────────────────────┐  │
│  │   Auth & Security     │   │   Trade Ingestion     │   │   Scenario & Simulation Engine     │  │
│  │ (JWT, RBAC, Auditing) │   │ (CBIC, DGFT, USITC)   │   │  (Feasibility Pruning, Simulation) │  │
│  └───────────────────────┘   └───────────────────────┘   └────────────────────────────────────┘  │
└───────┬──────────────────────────────┬────────────────────────────────┬──────────────────────────┘
        │                              │                                │
        ▼                              ▼                                ▼
┌──────────────┐             ┌──────────────────┐             ┌──────────────────┐
│ MULTI-AGENT  │             │   GOOGLE OR-TOOLS│             │  SAP INTEGRATION │
│ AI ENGINE    │             │   MIP OPTIMIZER  │             │    BOUNDARY      │
│ (Gemini LLM) │             │ (Cost & Lead Time)│             │ (CPI, S/4, SAC)  │
└──────────────┘             └──────────────────┘             └──────────────────┘
```

---

## 2. Layer-by-Layer Architectural Decomposition

### 2.1. Frontend Control Plane (`frontend/src/`)
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
- **Styling & UI**: Tailwind CSS v4 + shadcn/ui + Lucide Icons + Glassmorphism design system.
- **Visual Network Graph**: `@xyflow/react` (React Flow) for interactive multi-tier supply chain node & route mapping (`SupplyNetworkGraph.tsx`).
- **Analytics & Data Visualization**: Recharts (`SimulationKPICharts.tsx`) for baseline vs. simulated KPI comparisons.
- **State Management & Auth**: JWT-backed localStorage session context with client-side role guards (`BUYER` vs. `SUPPLIER`).

---

### 2.2. Backend Microservice Layer (`backend/app/`)
- **Framework**: FastAPI (Python 3.13) + Pydantic v2 + Uvicorn.
- **Database Layer**: SQLAlchemy ORM + Alembic schema migrations.
  - **Operational Database**: SQLite local (`ares.db`) / PostgreSQL.
  - **In-Memory Analytical Engine**: Native SQL analytical aggregations for exposure matrices (`routers/sap.py`).
- **Security & Authorization**:
  - JWT token generation & verification (`auth.py`).
  - Role-Based Access Control (`require_buyer`, `require_supplier`).
  - Real-time immutable audit trail logging (`crud.log_action`).

---

### 2.3. Trade & Tariff Threat Detection Pipeline (`services/trade_adapters.py`)

ARES continuously ingests trade policies, customs notifications, and tariff rate increases:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL GOVERNMENT SOURCES                           │
│   • CBIC (Customs, Duty Rates)    • DGFT (Import/Export Notices)    • USITC     │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │ Raw HTML / JSON / API
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           TRADE SOURCE ADAPTER LAYER                           │
│   • CBICAdapter                   • DGFTAdapter                   • USITCAdapter│
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │ 3-Tier Fail-Safe Fallback
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           LLM NORMALIZATION ENGINE                             │
│   Parses legal gazettes → extracts HS Codes, % duty hikes, effective dates    │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │ Normalized TariffEvent (DETECTED)
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           HUMAN-IN-THE-LOOP REVIEW                             │
│   Buyer approves event → Status transitions to CONFIRMED → Flags Supplier Risk │
└────────────────────────────────────────────────────────────────────────────────┘
```

#### **Fail-Safe 3-Tier Execution Path**:
1. **Tier 1 (Live REST API)**: Attempts REST endpoints using `USITC_API_KEY` from `backend/.env`.
2. **Tier 2 (Tariff Lookup)**: Hits HTS chapter endpoints for specific supply-chain materials.
3. **Tier 3 (Structured Fallback)**: If external APIs are offline or rate-limited, returns deterministic mock data so the platform has 100% operational uptime.

---

### 2.4. Multi-Agent AI & Mathematical Optimization Pipeline

When a tariff or logistics disruption occurs, ARES generates candidate recovery plans using AI and validates them deterministically using mathematical programming:

```
Disruption Event → LLM Scenario Candidates → Feasibility Pruning → Google OR-Tools MIP → Score & Rank → Human Approval
```

1. **Multi-Agent LLM Engine (`services/llm_engine.py` & `ai_agent.py`)**:
   - Powered by Google Gemini (`GEMINI_API_KEY`).
   - Coordinates 6 specialized agents:
     - **Supplier Agent**: Evaluates supplier onboarding status, allocation limits, and capacity.
     - **Inventory Agent**: Checks safety stock thresholds across plants.
     - **Logistics Agent**: Analyzes lead times and transit routes.
     - **Finance Agent**: Computes duty cost deltas and penalty estimations.
     - **Compliance Agent**: Ensures supplier certification requirements.
     - **Scenario Agent**: Synthesizes multi-action mitigation strategies.

2. **Feasibility Pruning Engine**:
   - Prunes infeasible scenarios (e.g. supplier unapproved, capacity exceeded, route restricted).

3. **Google OR-Tools MIP Solver (`services/optimizer.py`)**:
   - Formulates a **Mixed-Integer Linear Program (MIP)**.
   - **Objective Function**: Minimize `Total Cost = (Quantity × Unit Cost) + (Quantity × Tariff Rate) + (Quantity × Freight Cost) + Penalty`.
   - **Constraints**: Demand satisfaction, supplier capacity caps, allocation limits.

4. **Simulation Engine (`services/simulation.py`)**:
   - Evaluates approved scenarios against baseline KPIs (Sourcing Cost Delta, Delivery Lead Time Shift, Continuity Index, Risk Score) without mutating operational database state.

---

### 2.5. SAP Ecosystem Integration Architecture

ARES integrates natively across the SAP BTP & S/4HANA enterprise stack:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                             SAP ENTERPRISE ECOSYSTEM                           │
└─────┬──────────────────────────┬───────────────────────┬───────────────────────┘
      │                          │                       │
      ▼                          ▼                       ▼
┌──────────────┐         ┌──────────────┐        ┌──────────────┐
│  SAP BTP     │         │ SAP S/4HANA  │        │ SAP ANALYTICS│
│ Integration  │         │    OData     │        │  CLOUD (SAC) │
│    Suite     │         │   Services   │        │   Data Push  │
└──────────────┘         └──────────────┘        └──────────────┘
```

#### **Detailed SAP Component Roles**:

| SAP Component | Config Variable (`backend/.env`) | Architectural Function |
| :--- | :--- | :--- |
| **SAP Integration Suite (CPI)** | `SAP_INTEGRATION_URL` | Enterprise gateway for customs webhooks (`/api/sap/webhook/tariff-event`) and iFlow bundles ([ARES_Inbound_Customs_Webhook.zip](file:///c:/Users/ASUS/OneDrive/Desktop/sap/ARES_Inbound_Customs_Webhook.zip)). |
| **SAP Business Accelerator Hub / S/4HANA** | `SAP_HUB_BASE_URL`, `SAP_API_KEY` | Fetches live Materials (`A_Product`), Stock Levels (`A_MaterialStock`), and auto-creates Purchase Orders (`A_PurchaseOrder`) upon scenario approval. |
| **SAP Analytics Cloud (SAC)** | `SAP_ANALYTICS_URL` | Receives automated real-time background streams (`/api/sap/sync-analytics`) of supply network risk matrices and financial disruption exposure models. |
| **SAP Generative AI Hub** | `SAP_GENAI_URL` | BTP AI Core LLM model deployment for enterprise multi-agent execution. |
| **SAP HANA Cloud** | `DATABASE_URL` | Operational & analytical database layer supporting in-memory aggregations. |

---

## 3. Supplier Onboarding & Lifecycle State Machine

ARES enforces strict organization isolation and security boundaries:

```
[REGISTERED] ──► [PENDING_VERIFICATION] ──► [UNDER_REVIEW] ──► [APPROVED] ──► [ACTIVE]
                                                                    │
                                                                    ▼
                                                            [REJECTED / SUSPENDED]
```

- **Buyer Control**: Buyers review supplier profiles, capacity limits, and compliance documents before approving status transitions (`PUT /api/suppliers/{org_id}/status`).
- **Role Isolation**: Suppliers can only view and update their own risk exposure forms (`/api/tariffs/confirmations`), preventing cross-tenant data leakage.

---

## 4. End-to-End Data Flow Sequence

1. **Ingest**: CBIC/USITC adapter or SAP CPI Webhook detects trade policy change → creates `TariffEvent` (`DETECTED`).
2. **Review**: Buyer reviews and confirms tariff event → status becomes `CONFIRMED`.
3. **Risk Exposure**: Impacted suppliers submit confirmation (`CONFIRMED_AFFECTED` or `NOT_AFFECTED`).
4. **AI & Math Optimization**: AI Scenario Agent generates candidate recovery routes → Google OR-Tools solves MIP for lowest cost & lead time → presents scored options to Buyer.
5. **Human Approval**: Buyer approves optimal scenario → auto-triggers SAP Purchase Order generation and updates Simulation KPIs.
6. **Executive Analytics**: Auto-syncs updated supply chain network metrics to SAP Analytics Cloud.

---

## 5. Security & Deployment Architecture

- **Authentication**: JWT (`HS256`) with 24-hour expiration.
- **Environment Confidentiality**: All credentials (`GEMINI_API_KEY`, `USITC_API_KEY`, `SAP_API_KEY`, `DATABASE_URL`) are managed strictly server-side in `backend/.env` and excluded from source control via `.gitignore`.
- **Containerization**:
  - `docker-compose.yml`: Orchestrates FastAPI backend, Next.js frontend, PostgreSQL, and Redis/Celery worker containers.
