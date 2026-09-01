"""Quick test for dynamic fallback scenario generator."""
import sys
sys.path.insert(0, ".")

from backend.app.database import SessionLocal
from backend.app.services.ai_agent import run_recovery_scenario_generation

db = SessionLocal()

# Test event 1 with MAT-001
res1 = run_recovery_scenario_generation(db=db, event_id=1, product_id="MAT-001", demand_qty=3500, user_org_id="org-buyer-1")
print(f"=== Event 1 / MAT-001 / qty=3500 ===")
print(f"Status: {res1['status']}")
for i, s in enumerate(res1["scenarios"]):
    acts = s.get("action_details", [])
    sup = acts[0].get("supplier_org_id", "?") if acts else "?"
    route = acts[0].get("route_id", "?") if acts else "?"
    print(f"  {i+1}. [{s['objective']}] {s['name']} | supplier={sup} route={route}")

print()

# Test a different product if available
res2 = run_recovery_scenario_generation(db=db, event_id=1, product_id="MAT-001", demand_qty=1000, user_org_id="org-buyer-1")
print(f"=== Event 1 / MAT-001 / qty=1000 ===")
print(f"Status: {res2['status']}")
for i, s in enumerate(res2["scenarios"]):
    acts = s.get("action_details", [])
    sup = acts[0].get("supplier_org_id", "?") if acts else "?"
    print(f"  {i+1}. [{s['objective']}] {s['name']} | supplier={sup}")

db.close()
