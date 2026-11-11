from copy import deepcopy
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.src.main import app
from apps.api.src.routes.v1.endpoints import approvals as approvals_ep
from apps.api.src.routes.v1.endpoints import transactions as tx_ep
from apps.api.src.services.payments.gateway import PaymentIntent
from apps.api.src.services.paypal.client import PayPalClient, paypal_client
from apps.api.src.services.paypal.errors import PayPalOrderError
from apps.api.src.services.paypal.orders import (
    build_checkout_return_urls,
    extract_capture_info,
    extract_frontend_origin,
    resolve_frontend_base_url,
)

AUTH_HEADERS = {"X-API-Key": "dev-agent-key-123"}


@pytest.fixture
def isolated_stores():
    orig_txs = deepcopy(tx_ep._TRANSACTIONS)
    orig_queue = deepcopy(approvals_ep._APPROVAL_QUEUE)
    orig_spend = tx_ep._GLOBAL_SPEND_STATE.model_copy(deep=True)
    with patch.object(tx_ep, "_save_transactions"), patch.object(approvals_ep, "_save_approvals"):
        tx_ep._TRANSACTIONS.clear()
        approvals_ep._APPROVAL_QUEUE.clear()
        yield
    tx_ep._TRANSACTIONS[:] = orig_txs
    approvals_ep._APPROVAL_QUEUE.clear()
    approvals_ep._APPROVAL_QUEUE.update(orig_queue)
    tx_ep._GLOBAL_SPEND_STATE.current_monthly_spend = orig_spend.current_monthly_spend
    tx_ep._GLOBAL_SPEND_STATE.current_daily_spend = orig_spend.current_daily_spend
    tx_ep._GLOBAL_SPEND_STATE.daily_purchase_count = orig_spend.daily_purchase_count


def test_paypal_client_env_whitespace_and_mock_fallback(monkeypatch):
    monkeypatch.setenv("PAYPAL_CLIENT_ID", "  ARvTestClientId123456  ")
    monkeypatch.setenv("PAYPAL_CLIENT_SECRET", "  EKfTestSecret789012  ")
    monkeypatch.setenv("PAYPAL_BASE_URL", " https://api-m.sandbox.paypal.com/ ")
    monkeypatch.setenv("MOCK_PAYPAL", "false")

    client = PayPalClient()
    assert client.client_id == "ARvTestClientId123456"
    assert client.client_secret == "EKfTestSecret789012"
    assert client.base_url == "https://api-m.sandbox.paypal.com"
    assert client.mock_mode is False
    status = client.get_status()
    assert status["mode"] == "sandbox"
    assert status["client_id_configured"] is True
    assert status["client_secret_configured"] is True
    assert "EKfTestSecret" not in str(status)

    # Missing secret enforces mock mode cleanly
    monkeypatch.setenv("PAYPAL_CLIENT_SECRET", "mock_secret")
    client.reload_config()
    assert client.mock_mode is True


def test_mock_request_routes_capture_and_get_order_properly():
    client = PayPalClient()
    created = client._mock_request("POST", "/v2/checkout/orders", {})
    assert created["id"].startswith("MOCK-ORDER-")
    assert created["status"] == "CREATED"

    captured = client._mock_request("POST", "/v2/checkout/orders/9Y049467S40277332/capture", {})
    assert captured["id"] == "9Y049467S40277332"
    assert captured["status"] == "COMPLETED"
    cap_id, _, _ = extract_capture_info(captured)
    assert cap_id is not None and cap_id.startswith("MOCK-CAP-")

    fetched = client._mock_request("GET", "/v2/checkout/orders/9Y049467S40277332")
    assert fetched["id"] == "9Y049467S40277332"
    assert fetched["status"] == "COMPLETED"


def test_return_url_resolution_respects_allowlist(monkeypatch):
    monkeypatch.delenv("FRONTEND_URL", raising=False)
    assert resolve_frontend_base_url("https://mandate-2ht2.vercel.app") == "https://mandate-2ht2.vercel.app"
    assert resolve_frontend_base_url("https://mandate-preview-abc.vercel.app") == "https://mandate-preview-abc.vercel.app"
    assert resolve_frontend_base_url("http://localhost:5173") == "http://localhost:5173"
    # Untrusted origin must fall back safely
    assert resolve_frontend_base_url("https://evil.example.com") == "https://mandate-2ht2.vercel.app"

    origin = extract_frontend_origin({"Referer": "https://mandate-2ht2.vercel.app/dashboard?foo=1"})
    ret, can = build_checkout_return_urls(origin)
    assert ret == "https://mandate-2ht2.vercel.app/dashboard?paypal_status=success"
    assert can == "https://mandate-2ht2.vercel.app/dashboard?paypal_status=cancel"


@pytest.mark.asyncio
async def test_paypal_status_and_test_endpoints_never_leak_secrets():
    orig_mock = paypal_client.mock_mode
    try:
        paypal_client.mock_mode = True
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            status_res = await ac.get("/api/v1/paypal/status")
            assert status_res.status_code == 200
            status_data = status_res.json()
            assert status_data["mock_mode"] is True
            assert "client_secret" not in status_data

            test_res = await ac.post("/api/v1/settings/integrations/paypal/test")
            assert test_res.status_code == 200
            test_data = test_res.json()
            assert test_data["verified"] is False
            assert test_data["mock_mode"] is True

        paypal_client.mock_mode = False
        with patch.object(paypal_client, "_get_access_token", AsyncMock(return_value="tok_123")):
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                ok_res = await ac.post("/api/v1/settings/integrations/paypal/test")
                assert ok_res.status_code == 200
                ok_data = ok_res.json()
                assert ok_data["verified"] is True
                assert ok_data["mock_mode"] is False
                assert ok_data["latency_ms"] >= 1
    finally:
        paypal_client.mock_mode = orig_mock


@pytest.mark.asyncio
async def test_propose_complete_and_refund_paypal_lifecycle(isolated_stores):
    order_id = "ORDER123456789"
    capture_id = "CAP987654321"

    class FakeGateway:
        def __init__(self):
            self.created_kwargs = None
            self.refund_calls = []

        async def create_intent(self, **kwargs):
            self.created_kwargs = kwargs
            return PaymentIntent(
                id=order_id,
                status="PAYER_ACTION_REQUIRED",
                amount_cents=kwargs["amount_cents"],
                currency=kwargs["currency"],
                provider_raw={
                    "id": order_id,
                    "status": "PAYER_ACTION_REQUIRED",
                    "links": [
                        {
                            "rel": "payer-action",
                            "href": f"https://www.sandbox.paypal.com/checkoutnow?token={order_id}",
                        }
                    ],
                },
            )

        async def capture_intent(self, intent_id: str, idempotency_key: str = None):
            return PaymentIntent(
                id=intent_id,
                status="COMPLETED",
                amount_cents=5000,
                currency="USD",
                provider_raw={
                    "id": intent_id,
                    "status": "COMPLETED",
                    "purchase_units": [
                        {
                            "payments": {
                                "captures": [
                                    {
                                        "id": capture_id,
                                        "status": "COMPLETED",
                                        "amount": {"currency_code": "USD", "value": "50.00"},
                                    }
                                ]
                            }
                        }
                    ],
                },
            )

        async def get_intent(self, intent_id: str):
            return PaymentIntent(
                id=intent_id,
                status="COMPLETED",
                amount_cents=5000,
                currency="USD",
                provider_raw={
                    "id": intent_id,
                    "status": "COMPLETED",
                    "purchase_units": [
                        {
                            "payments": {
                                "captures": [
                                    {
                                        "id": capture_id,
                                        "status": "COMPLETED",
                                        "amount": {"currency_code": "USD", "value": "50.00"},
                                    }
                                ]
                            }
                        }
                    ],
                },
            )

        async def refund(self, capture_id: str, amount_cents=None, currency="USD", idempotency_key=None):
            self.refund_calls.append((capture_id, amount_cents, currency))
            return {"id": "RFND123", "status": "COMPLETED"}

    fake_gw = FakeGateway()
    orig_mock = paypal_client.mock_mode
    paypal_client.mock_mode = False
    try:
        with patch.object(tx_ep.PaymentGatewayFactory, "get_gateway", return_value=fake_gw):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                spend_before = tx_ep._GLOBAL_SPEND_STATE.current_monthly_spend
                propose_res = await ac.post(
                    "/api/v1/transactions/propose",
                    json={
                        "amount_cents": 5000,
                        "merchant": "OfficeDepot",
                        "category": "Office",
                        "description": "Keyboard",
                        "currency": "USD",
                    },
                    headers={**AUTH_HEADERS, "Origin": "https://mandate-2ht2.vercel.app"},
                )
                assert propose_res.status_code == 200
                p_data = propose_res.json()
                assert p_data["transaction"]["status"] == "COMPLETED"
                assert p_data["transaction"]["payment_status"] == "PENDING_PAYMENT"
                assert fake_gw.created_kwargs["return_url"] == "https://mandate-2ht2.vercel.app/dashboard?paypal_status=success"
                assert tx_ep._GLOBAL_SPEND_STATE.current_monthly_spend == spend_before + 5000

                # Complete using the PayPal Order ID as return callback does
                cap_res = await ac.post(
                    f"/api/v1/transactions/{order_id}/complete",
                    json={"paypal_order_id": order_id},
                    headers=AUTH_HEADERS,
                )
                assert cap_res.status_code == 200
                cap_data = cap_res.json()
                assert cap_data["capture_id"] == capture_id
                assert cap_data["transaction"]["payment_status"] == "COMPLETED"
                # Must not double-count spend already recorded during propose
                assert tx_ep._GLOBAL_SPEND_STATE.current_monthly_spend == spend_before + 5000

                # Refund using the Order ID + JSON body (as Transactions.tsx sends)
                ref_res = await ac.post(
                    f"/api/v1/transactions/{order_id}/refund",
                    json={"amount_cents": 5000},
                    headers=AUTH_HEADERS,
                )
                assert ref_res.status_code == 200
                ref_data = ref_res.json()
                assert ref_data["capture_id"] == capture_id
                assert ref_data["transaction"]["status"] == "REFUNDED"
                assert fake_gw.refund_calls == [(capture_id, 5000, "USD")]
    finally:
        paypal_client.mock_mode = orig_mock


@pytest.mark.asyncio
async def test_complete_transaction_returns_409_when_order_not_approved(isolated_stores):
    order_id = "UNAPPROVED999"

    class UnapprovedGateway:
        async def capture_intent(self, intent_id: str, idempotency_key: str = None):
            raise PayPalOrderError(
                "Order not approved",
                422,
                raw_response={"details": [{"issue": "ORDER_NOT_APPROVED", "description": "Payer has not approved the Order."}]},
            )

        async def get_intent(self, intent_id: str):
            return PaymentIntent(
                id=intent_id,
                status="PAYER_ACTION_REQUIRED",
                amount_cents=5000,
                currency="USD",
                provider_raw={"id": intent_id, "status": "PAYER_ACTION_REQUIRED"},
            )

    orig_mock = paypal_client.mock_mode
    paypal_client.mock_mode = False
    try:
        with patch.object(tx_ep.PaymentGatewayFactory, "get_gateway", return_value=UnapprovedGateway()):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                res = await ac.post(
                    f"/api/v1/transactions/{order_id}/complete",
                    json={"paypal_order_id": order_id},
                    headers=AUTH_HEADERS,
                )
                assert res.status_code == 409
                assert "not been approved" in res.json()["detail"].lower()
                assert len(tx_ep._TRANSACTIONS) == 0
    finally:
        paypal_client.mock_mode = orig_mock


@pytest.mark.asyncio
async def test_approve_uses_fresh_idempotency_key_per_attempt_and_surfaces_422(isolated_stores):
    seen_keys = []

    class TrackingGateway:
        async def create_intent(self, **kwargs):
            seen_keys.append(kwargs.get("idempotency_key"))
            return PaymentIntent(
                id="ORDERFRESH001",
                status="PAYER_ACTION_REQUIRED",
                amount_cents=kwargs["amount_cents"],
                currency=kwargs["currency"],
                provider_raw={"id": "ORDERFRESH001", "status": "PAYER_ACTION_REQUIRED", "links": []},
            )

    approvals_ep._APPROVAL_QUEUE["req-2"] = {
        "id": "req-2",
        "merchant": "B&H Photo",
        "item": "Webcam",
        "amount": 149,
        "amount_cents": 14900,
        "status": "pending",
    }

    with patch.object(approvals_ep.PaymentGatewayFactory, "get_gateway", return_value=TrackingGateway()):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            r1 = await ac.post("/api/v1/approvals/req-2/approve", json={}, headers=AUTH_HEADERS)
            assert r1.status_code == 200
            assert seen_keys[-1].startswith("idem_appr_req-2_")

            # Simulate seed reset (same approval ID approved a second time)
            approvals_ep._APPROVAL_QUEUE["req-2"]["status"] = "pending"
            r2 = await ac.post("/api/v1/approvals/req-2/approve", json={}, headers=AUTH_HEADERS)
            assert r2.status_code == 200
            assert seen_keys[0] != seen_keys[1]

    class FailingGateway:
        async def create_intent(self, **kwargs):
            raise PayPalOrderError(
                "Failed to create order",
                422,
                debug_id="dbg123",
                raw_response={
                    "details": [
                        {"issue": "ORDER_ALREADY_CAPTURED", "description": "Order already captured."}
                    ]
                },
            )

    approvals_ep._APPROVAL_QUEUE["req-2"]["status"] = "pending"
    with patch.object(approvals_ep.PaymentGatewayFactory, "get_gateway", return_value=FailingGateway()):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            fail_res = await ac.post("/api/v1/approvals/req-2/approve", json={}, headers=AUTH_HEADERS)
            assert fail_res.status_code == 422
            assert "ORDER_ALREADY_CAPTURED" in fail_res.json()["detail"]
            assert "dbg123" in fail_res.json()["detail"]


@pytest.mark.asyncio
async def test_complete_transaction_returns_actionable_422_on_compliance_violation(isolated_stores):
    order_id = "COMPVIOL999"

    class ComplianceGateway:
        async def capture_intent(self, intent_id: str, idempotency_key: str = None):
            raise PayPalOrderError(
                "Failed to capture order",
                422,
                debug_id="ca58eb2512cf3",
                raw_response={
                    "details": [
                        {
                            "issue": "COMPLIANCE_VIOLATION",
                            "description": "Transaction cannot be processed due to a possible compliance violation.",
                        }
                    ]
                },
            )

        async def get_intent(self, intent_id: str):
            return PaymentIntent(
                id=intent_id,
                status="APPROVED",
                amount_cents=11999,
                currency="USD",
                provider_raw={"id": intent_id, "status": "APPROVED"},
            )

    orig_mock = paypal_client.mock_mode
    paypal_client.mock_mode = False
    try:
        with patch.object(tx_ep.PaymentGatewayFactory, "get_gateway", return_value=ComplianceGateway()):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                res = await ac.post(
                    f"/api/v1/transactions/{order_id}/complete",
                    json={"paypal_order_id": order_id},
                    headers=AUTH_HEADERS,
                )
                assert res.status_code == 422
                detail = res.json()["detail"]
                assert "COMPLIANCE_VIOLATION" in detail
                assert "ca58eb2512cf3" in detail
    finally:
        paypal_client.mock_mode = orig_mock
