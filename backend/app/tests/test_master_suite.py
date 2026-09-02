"""
test_master_suite.py — Master Integration & Verification Runner for ARES Enterprise

Executes comprehensive tests across all 6 core product pillars:
1. Category A: Database Connection Pooling & Multi-Tenant Isolation
2. Category B: AI Async Queue, SSE Streaming & Expert Engine Optimization
3. Category C: Trade Data Ingestion & Multi-Regional Adapters (7 Adapters)
4. Category D: SAP S/4HANA Transactional PO & Compensation Rollbacks
5. Category E: Security, HttpOnly Cookies, SSO, & SHA-256 Audit Chaining
6. Category F: Collaborative Negotiation Loops, E-Signatures & Timeout SLAs
"""

import os
import sys
import time
from pathlib import Path

os.environ["FAST_TEST_MODE"] = "1"

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import test_database_pooling
import test_ai_engine_fixes
import test_trade_adapters
import test_sap_transactional
import test_security_fixes
import test_supplier_negotiations

def run_suite(name: str, runner_func):
    start = time.time()
    print(f"\n======================================================================")
    print(f"[*] EXECUTING TEST SUITE: {name}")
    print(f"======================================================================")
    try:
        runner_func()
        elapsed = round((time.time() - start) * 1000, 2)
        print(f"[OK] {name} -- ALL TESTS PASSED ({elapsed} ms)")
        return True, elapsed, None
    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 2)
        print(f"[FAIL] {name} -- FAILED ({elapsed} ms): {e}")
        return False, elapsed, str(e)

def run_all():
    print("=" * 70)
    print("      ARES ENTERPRISE DECISION PLATFORM -- MASTER TEST RUNNER          ")
    print("=" * 70)

    suites = [
        ("Category A: Database Pooling & Row-Level Multi-Tenancy", lambda: (
            test_database_pooling.test_current_db_connection(),
            test_database_pooling.test_postgresql_queuepool_configuration(),
            test_database_pooling.test_sqlite_wal_pragmas(),
            test_database_pooling.test_row_level_tenant_isolation()
        )),
        ("Category B: AI Engine, Async Queue & Optimization Solver", lambda: (
            test_ai_engine_fixes.test_expert_resilience_engine_dynamic_generation(),
            test_ai_engine_fixes.test_or_tools_solver_time_limit_and_solution(),
            test_ai_engine_fixes.test_async_task_manager_lifecycle(),
            test_ai_engine_fixes.test_generate_scenarios_async_endpoint()
        )),
        ("Category C: Trade Data Ingestion & 7 Regulatory Adapters", lambda: (
            test_trade_adapters.test_trade_adapter_registry(),
            test_trade_adapters.test_federal_register_adapter(),
            test_trade_adapters.test_eu_taric_adapter(),
            test_trade_adapters.test_wto_monitoring_adapter(),
            test_trade_adapters.test_maritime_chokepoints_adapter()
        )),
        ("Category D: SAP S/4HANA Transactional PO & Compensating Rollbacks", lambda: (
            test_sap_transactional.test_sap_po_creation_and_cancellation(),
            test_sap_transactional.test_sap_change_request(),
            test_sap_transactional.test_sap_scenario_writeback_success_and_rollback(),
            test_sap_transactional.test_scenario_approval_erp_integration()
        )),
        ("Category E: Security, HttpOnly Cookies, SSO & Cryptographic Audit", lambda: (
            test_security_fixes.test_httponly_cookie_login_and_auth(),
            test_security_fixes.test_enterprise_sso_flow(),
            test_security_fixes.test_cryptographic_audit_log_hash_chain()
        )),
        ("Category F: Supplier Collaboration, E-Signatures & Timeout SLAs", lambda: (
            test_supplier_negotiations.test_collaborative_negotiation_full_lifecycle(),
            test_supplier_negotiations.test_overdue_negotiation_expiration()
        )),
    ]

    results = []
    total_start = time.time()
    for name, runner in suites:
        passed, elapsed, err = run_suite(name, runner)
        results.append((name, passed, elapsed, err))

    total_elapsed = round(time.time() - total_start, 2)
    print("\n" + "=" * 70)
    print("                     FINAL TEST SUITE SUMMARY                         ")
    print("=" * 70)
    
    all_passed = True
    for name, passed, elapsed, err in results:
        status_str = "PASSED" if passed else "FAILED"
        mark = "[OK]" if passed else "[FAIL]"
        print(f"{mark:<6} {name:<55} [{status_str}] ({elapsed} ms)")
        if not passed:
            all_passed = False
            print(f"       Error: {err}")

    print("-" * 70)
    print(f"Total Execution Time: {total_elapsed}s")
    if all_passed:
        print(">>> RESULT: ALL 6 ENTERPRISE ARCHITECTURE TEST SUITES PASSED (100% GREEN) <<<")
    else:
        print(">>> RESULT: SOME TEST SUITES FAILED <<<")
        sys.exit(1)


if __name__ == "__main__":
    run_all()
