import os

import httpx


class SlackService:
    @staticmethod
    async def notify_escalation(proposal_id: str, amount: int, justification: str, rule_cited: str):
        webhook_url = os.environ.get("SLACK_WEBHOOK_URL")
        if not webhook_url:
            return # Skip if not configured
            
        payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🚨 New Purchase Escalation"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Amount:* ${(amount / 100):.2f}\n*Rule Cited:* {rule_cited}\n*AI Justification:* {justification}"  # noqa: E501
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Approve via PayPal"
                            },
                            "style": "primary",
                            "value": f"approve_{proposal_id}"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Deny"
                            },
                            "style": "danger",
                            "value": f"deny_{proposal_id}"
                        }
                    ]
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            await client.post(webhook_url, json=payload)
