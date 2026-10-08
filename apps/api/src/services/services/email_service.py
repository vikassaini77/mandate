import logging

logger = logging.getLogger(__name__)

class EmailService:
    """
    Interface for sending emails. 
    In dev, this dumps to console. In prod, this would integrate with Resend/SendGrid/SMTP.
    """
    @classmethod
    def send_verification_email(cls, to_email: str, token: str):
        logger.info(f"--- EMAIL TO: {to_email} ---")
        logger.info("Subject: Verify your MANDATE account")
        logger.info(f"Body: Please verify your account using token: {token}")
        logger.info("-----------------------------")

    @classmethod
    def send_password_reset(cls, to_email: str, token: str):
        logger.info(f"--- EMAIL TO: {to_email} ---")
        logger.info("Subject: MANDATE Password Reset")
        logger.info(f"Body: Reset your password using token: {token}")
        logger.info("-----------------------------")
