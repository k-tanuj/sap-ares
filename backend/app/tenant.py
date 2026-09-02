"""
tenant.py — ARES Tenant Context & Row-Level Multi-Tenancy Manager

Provides thread-safe, request-scoped tenant context management using contextvars.
Enforces multi-tenant data isolation across Buyer and Supplier organizations.
"""

from contextvars import ContextVar
from typing import Optional

# Global context variable for active request tenant ID
_current_tenant: ContextVar[Optional[str]] = ContextVar("current_tenant", default=None)
_current_role: ContextVar[Optional[str]] = ContextVar("current_role", default=None)

def set_current_tenant(tenant_id: str, role: Optional[str] = None):
    """Sets the active tenant ID and role for the current execution context."""
    _current_tenant.set(tenant_id)
    if role:
        _current_role.set(role)

def get_current_tenant() -> Optional[str]:
    """Returns the active tenant ID for the current execution context."""
    return _current_tenant.get()

def get_current_role() -> Optional[str]:
    """Returns the active role for the current execution context."""
    return _current_role.get()

def clear_current_tenant():
    """Resets the active tenant context."""
    _current_tenant.set(None)
    _current_role.set(None)

class TenantContext:
    """Context manager for running code blocks with an explicit tenant scope."""
    def __init__(self, tenant_id: str, role: Optional[str] = None):
        self.tenant_id = tenant_id
        self.role = role
        self.prev_tenant = None
        self.prev_role = None

    def __enter__(self):
        self.prev_tenant = get_current_tenant()
        self.prev_role = get_current_role()
        set_current_tenant(self.tenant_id, self.role)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        set_current_tenant(self.prev_tenant, self.prev_role)
