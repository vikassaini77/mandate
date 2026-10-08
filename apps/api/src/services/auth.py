import os
from enum import Enum
from typing import List, Optional

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.security.api_key import APIKeyHeader

from apps.api.src.config.security import constant_time_compare, decode_token

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
security = HTTPBearer(auto_error=False)

# MOCK: In production, load this from a secure store / DB
KNOWN_API_KEYS = {
    os.environ.get("SYSTEM_AGENT_KEY", "dev-agent-key-123"): "system_agent"
}

class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"
    SYSTEM_AGENT = "system_agent"

class Principal:
    def __init__(self, tenant_id: str, identity_id: str, roles: List[Role], is_agent: bool = False):
        self.tenant_id = tenant_id
        self.identity_id = identity_id
        self.roles = roles
        self.is_agent = is_agent

def get_current_principal(
    api_key_header: str = Security(API_KEY_HEADER),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Principal:
    """
    Validates identity via API Key (for Agent Identity) OR JWT Bearer (for Human Users).
    Ensures Multi-Tenant boundaries.
    """
    # 1. Check API Key for Agent Identity
    if api_key_header:
        for valid_key, identity in KNOWN_API_KEYS.items():
            if constant_time_compare(api_key_header, valid_key):
                return Principal(
                    tenant_id="system_tenant", # Default system tenant
                    identity_id=identity,
                    roles=[Role.SYSTEM_AGENT],
                    is_agent=True
                )
        raise HTTPException(status_code=401, detail="Invalid API Key")

    # 2. Check JWT Bearer for Human Identity
    if auth:
        try:
            payload = decode_token(auth.credentials)
            tenant_id = payload.get("tenant_id")
            identity_id = payload.get("sub")
            role_str = payload.get("role", "employee")
            
            if not tenant_id or not identity_id:
                raise HTTPException(status_code=401, detail="Invalid token payload structure")
                
            return Principal(
                tenant_id=tenant_id,
                identity_id=identity_id,
                roles=[Role(role_str)],
                is_agent=False
            )
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")

    raise HTTPException(status_code=401, detail="Not authenticated")

def require_roles(allowed_roles: List[Role]):
    """RBAC Dependency: Validates if the Principal has the required role."""
    def role_checker(principal: Principal = Depends(get_current_principal)):
        has_role = any(role in allowed_roles for role in principal.roles)
        if not has_role:
            raise HTTPException(
                status_code=403, 
                detail="Operation not permitted for current role."
            )
        return principal
    return role_checker

def require_tenant(tenant_id: str, principal: Principal = Depends(get_current_principal)):
    """Multi-tenant Dependency: Ensures operations are restricted to the user's tenant."""
    if principal.tenant_id != tenant_id and Role.ADMIN not in principal.roles:
        raise HTTPException(
            status_code=403, 
            detail="Cross-tenant access forbidden."
        )
    return principal
