
from fastapi import APIRouter
router = APIRouter()

@router.get('/scenarios')
async def get_scenarios(): pass

@router.post('/run')
async def run_scenario(scenario_id: str): pass

@router.get('/results')
async def get_results(skip: int = 0, limit: int = 100): pass

@router.get('/scoreboard')
async def get_scoreboard(): pass
