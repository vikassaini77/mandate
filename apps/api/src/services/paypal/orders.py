import os
import re
import uuid
from typing import Any, Dict, Mapping, Optional, Tuple
from urllib.parse import urlparse

from apps.api.src.services.paypal.client import paypal_client
from apps.api.src.services.paypal.errors import PayPalOrderError

_DEFAULT_FRONTEND_URL = "https://mandate-2ht2.vercel.app"
_ALLOWED_ORIGIN_REGEX = re.compile(
    r"^(https://[a-zA-Z0-9-]+\.vercel\.app|http://(localhost|127\.0\.0\.1)(:\d{1,5})?)$"
)


def _normalize_origin(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    parsed = urlparse(raw.strip())
    if parsed.scheme in ("http", "https") and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return None


def get_default_frontend_url() -> str:
    env_url = (os.environ.get("FRONTEND_URL") or "").strip().rstrip("/")
    return env_url or _DEFAULT_FRONTEND_URL


def resolve_frontend_base_url(frontend_origin: Optional[str] = None) -> str:
    configured = get_default_frontend_url()
    candidate = _normalize_origin(frontend_origin)
    if candidate:
        configured_origin = _normalize_origin(configured)
        if candidate == configured_origin or _ALLOWED_ORIGIN_REGEX.match(candidate):
            return candidate.rstrip("/")
    return configured


def extract_frontend_origin(headers: Mapping[str, str]) -> Optional[str]:
    origin = headers.get("origin") or headers.get("Origin")
    normalized = _normalize_origin(origin)
    if normalized:
        return normalized
    referer = headers.get("referer") or headers.get("Referer")
    return _normalize_origin(referer)


def build_checkout_return_urls(frontend_origin: Optional[str] = None) -> Tuple[str, str]:
    base = resolve_frontend_base_url(frontend_origin)
    return (
        f"{base}/dashboard?paypal_status=success",
        f"{base}/dashboard?paypal_status=cancel",
    )


def extract_capture_info(order_payload: Dict[str, Any]) -> Tuple[Optional[str], Optional[int], str]:
    capture_id: Optional[str] = None
    amount_cents: Optional[int] = None
    currency = "USD"

    purchase_units = order_payload.get("purchase_units") or []
    if isinstance(purchase_units, list) and purchase_units:
        unit = purchase_units[0] or {}
        payments = unit.get("payments") or {}
        captures = payments.get("captures") or []
        if isinstance(captures, list) and captures:
            first_cap = captures[0] or {}
            capture_id = first_cap.get("id")
            cap_amt = first_cap.get("amount") or {}
            if cap_amt.get("value") is not None:
                try:
                    amount_cents = round(float(cap_amt["value"]) * 100)
                except (TypeError, ValueError):
                    pass
            if cap_amt.get("currency_code"):
                currency = cap_amt["currency_code"]

        if amount_cents is None:
            unit_amt = unit.get("amount") or {}
            if unit_amt.get("value") is not None:
                try:
                    amount_cents = round(float(unit_amt["value"]) * 100)
                except (TypeError, ValueError):
                    pass
            if unit_amt.get("currency_code"):
                currency = unit_amt["currency_code"]

    return capture_id, amount_cents, currency


def extract_paypal_issue(exc: Exception) -> Tuple[Optional[str], Optional[str]]:
    raw = getattr(exc, "raw_response", None)
    if not isinstance(raw, dict):
        return None, str(exc)
    details = raw.get("details")
    if isinstance(details, list) and details:
        first = details[0] or {}
        return first.get("issue"), first.get("description") or raw.get("message") or str(exc)
    return raw.get("name"), raw.get("message") or str(exc)


async def create_order(
    amount_cents: int,
    currency: str,
    reference_id: str,
    idempotency_key: str = None,
    return_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
    frontend_origin: Optional[str] = None,
) -> Dict[str, Any]:  # noqa: E501
    """
    Creates a PayPal Order with INTENT = CAPTURE.
    Amount must be converted from cents to string decimal format (e.g., 1050 -> '10.50').
    """
    if not idempotency_key:
        idempotency_key = f"create_{reference_id}_{uuid.uuid4().hex[:8]}"

    amount_str = f"{amount_cents / 100:.2f}"
    default_return_url, default_cancel_url = build_checkout_return_urls(frontend_origin)
    resolved_return_url = return_url or default_return_url
    resolved_cancel_url = cancel_url or default_cancel_url

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": reference_id,
                "amount": {
                    "currency_code": currency,
                    "value": amount_str,
                },
            }
        ],
        "payment_source": {
            "paypal": {
                "experience_context": {
                    "brand_name": "MANDATE",
                    "landing_page": "LOGIN",
                    "user_action": "PAY_NOW",
                    "return_url": resolved_return_url,
                    "cancel_url": resolved_cancel_url,
                }
            }
        },
    }

    try:
        response = await paypal_client.request(
            method="POST",
            endpoint="/v2/checkout/orders",
            json=payload,
            idempotency_key=idempotency_key,
        )
        return response
    except Exception as e:
        raise PayPalOrderError(
            f"Failed to create order: {str(e)}",
            getattr(e, "status_code", 500),
            debug_id=getattr(e, "debug_id", None),
            raw_response=getattr(e, "raw_response", None),
        )


async def capture_order(order_id: str, idempotency_key: str = None) -> Dict[str, Any]:
    """
    Captures an approved PayPal Order.
    """
    if not idempotency_key:
        idempotency_key = f"capture_{order_id}_{uuid.uuid4().hex[:8]}"

    try:
        response = await paypal_client.request(
            method="POST",
            endpoint=f"/v2/checkout/orders/{order_id}/capture",
            json={},
            idempotency_key=idempotency_key,
        )
        return response
    except Exception as e:
        raise PayPalOrderError(
            f"Failed to capture order {order_id}: {str(e)}",
            getattr(e, "status_code", 500),
            debug_id=getattr(e, "debug_id", None),
            raw_response=getattr(e, "raw_response", None),
        )  # noqa: E501


async def get_order(order_id: str) -> Dict[str, Any]:
    """
    Retrieves details of an existing Order.
    """
    try:
        response = await paypal_client.request(
            method="GET",
            endpoint=f"/v2/checkout/orders/{order_id}",
        )
        return response
    except Exception as e:
        raise PayPalOrderError(
            f"Failed to fetch order {order_id}: {str(e)}",
            getattr(e, "status_code", 500),
            debug_id=getattr(e, "debug_id", None),
            raw_response=getattr(e, "raw_response", None),
        )  # noqa: E501


async def refund_capture(
    capture_id: str,
    idempotency_key: str = None,
    amount_cents: int = None,
    currency: str = None,
) -> Dict[str, Any]:  # noqa: E501
    """
    Refunds a captured payment.
    """
    if not idempotency_key:
        idempotency_key = f"refund_{capture_id}_{uuid.uuid4().hex[:8]}"

    payload = {}
    if amount_cents and currency:
        payload["amount"] = {
            "value": f"{amount_cents / 100:.2f}",
            "currency_code": currency,
        }

    try:
        response = await paypal_client.request(
            method="POST",
            endpoint=f"/v2/payments/captures/{capture_id}/refund",
            json=payload,
            idempotency_key=idempotency_key,
        )
        return response
    except Exception as e:
        raise PayPalOrderError(
            f"Failed to refund capture {capture_id}: {str(e)}",
            getattr(e, "status_code", 500),
            debug_id=getattr(e, "debug_id", None),
            raw_response=getattr(e, "raw_response", None),
        )  # noqa: E501
