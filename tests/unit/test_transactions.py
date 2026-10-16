import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.src.main import app

AUTH_HEADERS = {"X-API-Key": "dev-agent-key-123"}

@pytest.mark.asyncio
async def test_propose_transaction_under_limit():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "amount_cents": 5000,
            "merchant": "OfficeDepot",
            "category": "Office",
            "description": "Ergonomic keyboard",
            "currency": "USD"
        }
        res = await ac.post("/api/v1/transactions/propose", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["verdict"] == "APPROVE"
        assert data["transaction"]["status"] == "COMPLETED"
        assert data["audit_hash"] is not None

@pytest.mark.asyncio
async def test_propose_transaction_escalate_over_limit():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "amount_cents": 25000,
            "merchant": "Apple",
            "category": "Electronics",
            "description": "AirPods Pro",
            "currency": "USD"
        }
        res = await ac.post("/api/v1/transactions/propose", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["verdict"] == "ESCALATE"
        assert data["transaction"]["status"] == "PENDING_APPROVAL"
        assert "approval_id" in data["transaction"]

@pytest.mark.asyncio
async def test_propose_transaction_blocked_over_cap():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "amount_cents": 99999999,
            "merchant": "LuxuryYachts",
            "category": "Boats",
            "description": "Company Yacht",
            "currency": "USD"
        }
        res = await ac.post("/api/v1/transactions/propose", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["verdict"] == "BLOCK"
        assert data["transaction"]["status"] == "BLOCKED"
