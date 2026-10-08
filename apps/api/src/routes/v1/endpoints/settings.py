
from fastapi import APIRouter

router = APIRouter()

@router.get('/agent')
async def get_agent_settings(): pass

@router.patch('/agent')
async def update_agent_settings(): pass

@router.get('/notifications')
async def get_notifications(): pass

@router.patch('/notifications')
async def update_notifications(): pass

@router.get('/security')
async def get_security(): pass

@router.patch('/security')
async def update_security(): pass

@router.get('/integrations')
async def get_integrations(): pass

@router.patch('/integrations')
async def update_integrations(): pass

@router.get('/privacy')
async def get_privacy(): pass

@router.post('/privacy/export')
async def request_data_export(): pass

@router.post('/privacy/delete')
async def delete_account_grace_period(): pass
