
from fastapi import APIRouter

from apps.api.src.routes.v1.auth import router as auth_router
from apps.api.src.routes.v1.endpoints.agent import router as agent_router
from apps.api.src.routes.v1.endpoints.analytics import router as analytics_router
from apps.api.src.routes.v1.endpoints.approvals import router as approvals_router
from apps.api.src.routes.v1.endpoints.audit import router as audit_router
from apps.api.src.routes.v1.endpoints.health import router as health_router
from apps.api.src.routes.v1.endpoints.mandates import router as mandates_router
from apps.api.src.routes.v1.endpoints.ml import router as ml_router
from apps.api.src.routes.v1.endpoints.proposals import router as proposals_router
from apps.api.src.routes.v1.endpoints.redteam import router as redteam_router
from apps.api.src.routes.v1.endpoints.settings import router as settings_router
from apps.api.src.routes.v1.endpoints.transactions import router as transactions_router
from apps.api.src.routes.v1.endpoints.webhooks import router as webhooks_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(mandates_router, prefix='/mandates', tags=['mandates'])
api_router.include_router(agent_router, prefix='/agent', tags=['agent'])
api_router.include_router(proposals_router, prefix='/proposals', tags=['proposals'])
api_router.include_router(approvals_router, prefix='/approvals', tags=['approvals'])
api_router.include_router(audit_router, prefix='/audit', tags=['audit'])
api_router.include_router(transactions_router, prefix='/transactions', tags=['transactions'])
api_router.include_router(analytics_router, prefix='/analytics', tags=['analytics'])
api_router.include_router(redteam_router, prefix='/redteam', tags=['redteam'])
api_router.include_router(settings_router, prefix='/settings', tags=['settings'])
api_router.include_router(webhooks_router, prefix='/webhooks', tags=['webhooks'])
api_router.include_router(ml_router, prefix='/ml', tags=['ml'])
api_router.include_router(health_router, tags=['system'])

# Item 31-38: SaaS features
from apps.api.src.routes.v1.endpoints.admin import router as admin_router
from apps.api.src.routes.v1.endpoints.billing import router as billing_router

api_router.include_router(billing_router, prefix='/billing', tags=['billing'])
api_router.include_router(admin_router, prefix='/admin', tags=['admin'])
