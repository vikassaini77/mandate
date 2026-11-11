import asyncio
import base64
import logging
import os
import time
import uuid
from typing import Any, Dict, Optional

import httpx

from apps.api.src.services.paypal.errors import PayPalAPIError, PayPalAuthenticationError

logger = logging.getLogger(__name__)


def _load_env_files() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(override=False)
        render_secret_env = "/etc/secrets/.env"
        if os.path.exists(render_secret_env):
            load_dotenv(render_secret_env, override=False)
    except ImportError:
        pass


class PayPalClient:
    def __init__(self):
        self.access_token: Optional[str] = None
        self.token_expires_at: float = 0.0
        self.http_client = httpx.AsyncClient(timeout=10.0)
        self.reload_config()

    def reload_config(self) -> None:
        _load_env_files()
        self.client_id = (os.environ.get("PAYPAL_CLIENT_ID") or "mock_client_id").strip()
        self.client_secret = (os.environ.get("PAYPAL_CLIENT_SECRET") or "mock_secret").strip()

        mock_flag = os.environ.get("MOCK_PAYPAL", "false").strip().lower() == "true"
        self.mock_mode = (
            mock_flag
            or not self.client_id
            or self.client_id == "mock_client_id"
            or not self.client_secret
            or self.client_secret == "mock_secret"
        )

        self.base_url = (
            os.environ.get("PAYPAL_BASE_URL") or "https://api-m.sandbox.paypal.com"
        ).strip().rstrip("/")
        self.access_token = None
        self.token_expires_at = 0.0

    def get_status(self) -> Dict[str, Any]:
        cid_configured = bool(self.client_id and self.client_id != "mock_client_id")
        secret_configured = bool(self.client_secret and self.client_secret != "mock_secret")
        if self.mock_mode:
            mode = "mock"
        elif "api-m.paypal.com" in self.base_url:
            mode = "live"
        else:
            mode = "sandbox"

        preview = (
            f"{self.client_id[:6]}...{self.client_id[-4:]}"
            if cid_configured and len(self.client_id) > 10
            else ("configured" if cid_configured else "not_configured")
        )
        return {
            "mode": mode,
            "mock_mode": self.mock_mode,
            "environment": mode,
            "base_url": self.base_url,
            "client_id_configured": cid_configured,
            "client_secret_configured": secret_configured,
            "client_id_preview": preview,
        }

    async def close(self):
        await self.http_client.aclose()

    async def _get_access_token(self, force_refresh: bool = False) -> str:
        """Fetch and cache OAuth2 token."""
        if self.mock_mode:
            return "mock_access_token"

        if not force_refresh and self.access_token and time.time() < self.token_expires_at:
            return self.access_token

        auth = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()

        try:
            resp = await self.http_client.post(
                f"{self.base_url}/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {auth}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"grant_type": "client_credentials"},
            )
            resp.raise_for_status()
            data = resp.json()

            self.access_token = data["access_token"]
            # Cache it, subtracting a 10s buffer for safety
            self.token_expires_at = time.time() + data["expires_in"] - 10
            return self.access_token

        except httpx.HTTPStatusError as e:
            debug_id = e.response.headers.get("Paypal-Debug-Id")
            logger.error(f"PayPal Auth Failed (debug_id={debug_id}): {e.response.text}")
            try:
                raw_json = e.response.json()
            except Exception:
                raw_json = {"raw_text": e.response.text}
            raise PayPalAuthenticationError(
                "Failed to authenticate with PayPal",
                e.response.status_code,
                debug_id,
                raw_json,
            )  # noqa: E501
        except Exception as e:
            logger.error(f"PayPal Auth Network Error: {str(e)}")
            raise PayPalAuthenticationError(f"Network error: {str(e)}", 500)

    async def request(
        self,
        method: str,
        endpoint: str,
        json: dict = None,
        headers: dict = None,
        idempotency_key: str = None,
    ) -> Dict[str, Any]:  # noqa: E501
        """Wrapper to handle Auth, Idempotency, Retries (exp backoff for 5xx)."""
        if self.mock_mode:
            return self._mock_request(method, endpoint, json)

        token = await self._get_access_token()

        req_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        if headers:
            req_headers.update(headers)

        if idempotency_key and method.upper() in ["POST", "PATCH"]:
            req_headers["PayPal-Request-Id"] = idempotency_key

        url = f"{self.base_url}{endpoint}"

        max_retries = 3
        base_delay = 0.5

        for attempt in range(max_retries):
            try:
                resp = await self.http_client.request(
                    method=method,
                    url=url,
                    json=json,
                    headers=req_headers,
                )

                # If 5xx, we should retry
                if resp.status_code >= 500:
                    resp.raise_for_status()

                # 4xx or 2xx
                if not resp.is_success:
                    debug_id = resp.headers.get("Paypal-Debug-Id")
                    logger.error(f"PayPal API Error [{resp.status_code}] (debug_id={debug_id}): {resp.text}")  # noqa: E501
                    try:
                        raw_json = resp.json()
                    except Exception:
                        raw_json = {"raw_text": resp.text}
                    raise PayPalAPIError("PayPal API request failed", resp.status_code, debug_id, raw_json)  # noqa: E501

                # Success
                # Some endpoints (like 204 No Content) have empty body
                if resp.status_code == 204:
                    return {}
                return resp.json()

            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                is_5xx = isinstance(e, httpx.HTTPStatusError) and e.response.status_code >= 500
                is_network = isinstance(e, httpx.RequestError)

                if (is_5xx or is_network) and attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    logger.warning(f"PayPal API transient error, retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    continue

                if isinstance(e, httpx.HTTPStatusError):
                    debug_id = e.response.headers.get("Paypal-Debug-Id")
                    try:
                        raw_json = e.response.json()
                    except Exception:
                        raw_json = {"raw_text": e.response.text}
                    raise PayPalAPIError(
                        "PayPal API request failed after retries",
                        e.response.status_code,
                        debug_id,
                        raw_json,
                    )  # noqa: E501
                raise PayPalAPIError(f"PayPal Network request failed: {str(e)}", 500)

        raise PayPalAPIError("Max retries exceeded", 500)

    def _mock_request(self, method: str, endpoint: str, json_data: dict = None) -> Dict[str, Any]:
        """Faithful local simulator for offline demo."""
        method_u = method.upper()
        clean_endpoint = endpoint.rstrip("/")

        if method_u == "POST" and clean_endpoint.endswith("/capture"):
            parts = [p for p in clean_endpoint.split("/") if p]
            order_id = parts[-2] if len(parts) >= 2 else f"MOCK-ORDER-{uuid.uuid4().hex[:8].upper()}"
            return {
                "id": order_id,
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "payments": {
                            "captures": [
                                {
                                    "id": f"MOCK-CAP-{uuid.uuid4().hex[:8].upper()}",
                                    "status": "COMPLETED",
                                }
                            ]
                        }
                    }
                ],
            }

        if method_u == "POST" and "/v2/payments/captures/" in clean_endpoint and clean_endpoint.endswith("/refund"):
            return {
                "id": f"MOCK-REFUND-{uuid.uuid4().hex[:8].upper()}",
                "status": "COMPLETED",
            }

        if method_u == "POST" and clean_endpoint == "/v2/checkout/orders":
            return {
                "id": f"MOCK-ORDER-{uuid.uuid4().hex[:8].upper()}",
                "status": "CREATED",
                "links": [{"href": "http://mock-approve-url", "rel": "approve", "method": "GET"}],
            }

        if method_u == "GET" and clean_endpoint.startswith("/v2/checkout/orders/"):
            order_id = clean_endpoint.split("/")[-1]
            return {
                "id": order_id,
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "amount": {"currency_code": "USD", "value": "0.00"},
                        "payments": {
                            "captures": [
                                {
                                    "id": f"MOCK-CAP-{uuid.uuid4().hex[:8].upper()}",
                                    "status": "COMPLETED",
                                }
                            ]
                        },
                    }
                ],
            }

        if method_u == "POST" and "/v1/notifications/verify-webhook-signature" in clean_endpoint:
            return {"verification_status": "SUCCESS"}

        return {"status": "MOCK_SUCCESS"}


# Global singleton
paypal_client = PayPalClient()
