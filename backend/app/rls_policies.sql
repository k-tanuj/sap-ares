-- ==============================================================================
-- ARES ENTERPRISE POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- This script enables database-enforced Row-Level Security on PostgreSQL.
-- The active application tenant is set per-transaction via:
--   SET LOCAL app.current_tenant = '<tenant_id>';
-- ==============================================================================

-- 1. Enable RLS on Tenant-Sensitive Tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_supplier_relationships ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if re-applying
DROP POLICY IF EXISTS rls_supplier_notifications ON supplier_notifications;
DROP POLICY IF EXISTS rls_supplier_confirmations ON supplier_confirmations;
DROP POLICY IF EXISTS rls_facilities ON facilities;
DROP POLICY IF EXISTS rls_inventories ON inventories;
DROP POLICY IF EXISTS rls_supplier_conditions ON supplier_conditions;
DROP POLICY IF EXISTS rls_routes ON routes;

-- 3. Supplier Notifications Isolation Policy
-- Suppliers can only read/write notifications targeted to their organization ID.
CREATE POLICY rls_supplier_notifications ON supplier_notifications
    FOR ALL
    USING (
        supplier_org_id = current_setting('app.current_tenant', true)
        OR current_setting('app.current_tenant', true) = 'SYSTEM_ADMIN'
        OR current_setting('app.current_tenant', true) LIKE 'org-buyer-%'
    )
    WITH CHECK (
        supplier_org_id = current_setting('app.current_tenant', true)
        OR current_setting('app.current_tenant', true) = 'SYSTEM_ADMIN'
        OR current_setting('app.current_tenant', true) LIKE 'org-buyer-%'
    );

-- 4. Supplier Confirmations Isolation Policy
CREATE POLICY rls_supplier_confirmations ON supplier_confirmations
    FOR ALL
    USING (
        supplier_org_id = current_setting('app.current_tenant', true)
        OR current_setting('app.current_tenant', true) = 'SYSTEM_ADMIN'
        OR current_setting('app.current_tenant', true) LIKE 'org-buyer-%'
    );

-- 5. Facilities Organization Isolation Policy
CREATE POLICY rls_facilities ON facilities
    FOR ALL
    USING (
        organization_id = current_setting('app.current_tenant', true)
        OR current_setting('app.current_tenant', true) = 'SYSTEM_ADMIN'
        OR current_setting('app.current_tenant', true) LIKE 'org-buyer-%'
    );

-- 6. Inventory Levels Isolation Policy
CREATE POLICY rls_inventories ON inventories
    FOR ALL
    USING (
        organization_id = current_setting('app.current_tenant', true)
        OR current_setting('app.current_tenant', true) = 'SYSTEM_ADMIN'
        OR current_setting('app.current_tenant', true) LIKE 'org-buyer-%'
    );

-- 7. Sourcing Conditions Isolation Policy
CREATE POLICY rls_supplier_conditions ON supplier_conditions
    FOR ALL
    USING (
        supplier_org_id = current_setting('app.current_tenant', true)
        OR current_setting('app.current_tenant', true) = 'SYSTEM_ADMIN'
        OR current_setting('app.current_tenant', true) LIKE 'org-buyer-%'
    );

-- 8. Logistics Routes Isolation Policy
CREATE POLICY rls_routes ON routes
    FOR ALL
    USING (
        supplier_org_id IS NULL
        OR supplier_org_id = current_setting('app.current_tenant', true)
        OR current_setting('app.current_tenant', true) = 'SYSTEM_ADMIN'
        OR current_setting('app.current_tenant', true) LIKE 'org-buyer-%'
    );
