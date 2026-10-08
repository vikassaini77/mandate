import logging
import os

import httpx

logger = logging.getLogger(__name__)

class SlackHITLService:
    def __init__(self):
        self.webhook_url = os.environ.get("SLACK_WEBHOOK_URL")

    async def request_approval(self, transaction_id: str, amount: float, merchant: str, reason: str):  # noqa: E501
        """
        Sends an interactive message to Slack for Human-in-the-Loop approval.
        """
        if not self.webhook_url:
            logger.warning("SLACK_WEBHOOK_URL not set. Skipping Slack HITL notification.")
            # For hackathon demo purposes, we'll pretend it succeeded if no webhook is set.
            return {"status": "mocked", "message": "Slack webhook not configured"}

        payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🚨 Manual Approval Required"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Transaction ID:*\n{transaction_id}"},
                        {"type": "mrkdwn", "text": f"*Amount:*\n${amount:,.2f}"},
                        {"type": "mrkdwn", "text": f"*Merchant:*\n{merchant}"},
                        {"type": "mrkdwn", "text": f"*AI Reason:*\n{reason}"}
                    ]
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "Approve"},
                            "style": "primary",
                            "value": f"approve_{transaction_id}",
                            "action_id": "approve_transaction"
                        },
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "Reject"},
                            "style": "danger",
                            "value": f"reject_{transaction_id}",
                            "action_id": "reject_transaction"
                        }
                    ]
                }
            ]
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.webhook_url, json=payload)
                response.raise_for_status()
                return {"status": "success"}
            except Exception as e:
                logger.error(f"Failed to send Slack HITL message: {e}")
                return {"status": "error", "message": str(e)}

slack_hitl = SlackHITLService()
