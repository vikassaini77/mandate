class PayPalAPIError(Exception):
    def __init__(self, message: str, status_code: int, debug_id: str = None, raw_response: dict = None):  # noqa: E501
        super().__init__(message)
        self.status_code = status_code
        self.debug_id = debug_id
        self.raw_response = raw_response or {}

    def __str__(self):
        return f"PayPalAPIError(status={self.status_code}, debug_id={self.debug_id}): {self.args[0]}"  # noqa: E501

class PayPalAuthenticationError(PayPalAPIError):
    pass

class PayPalOrderError(PayPalAPIError):
    pass

class PayPalRefundError(PayPalAPIError):
    pass

class PayPalWebhookVerificationError(PayPalAPIError):
    pass
