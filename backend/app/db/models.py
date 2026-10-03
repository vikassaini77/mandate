import datetime
from typing import Optional

from sqlalchemy import (
    Integer, 
    String, 
    Boolean, 
    DateTime, 
    ForeignKey, 
    Text, 
    BigInteger, 
    JSON
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Session(Base, TimestampMixin):
    __tablename__ = "sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))

class Mandate(Base, TimestampMixin):
    __tablename__ = "mandates"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    # Money stored as integer minor units (cents)
    monthly_cap_amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3), default="USD")

class MandateRule(Base, TimestampMixin):
    __tablename__ = "mandate_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    mandate_id: Mapped[int] = mapped_column(ForeignKey("mandates.id"))
    rule_type: Mapped[str] = mapped_column(String(50)) # e.g. blocked_merchant, allowed_category
    rule_value: Mapped[str] = mapped_column(String(255))

class Proposal(Base, TimestampMixin):
    __tablename__ = "proposals"
    id: Mapped[int] = mapped_column(primary_key=True)
    mandate_id: Mapped[int] = mapped_column(ForeignKey("mandates.id"))
    product_name: Mapped[str] = mapped_column(String(255))
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    merchant: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(255))
    llm_reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class Verdict(Base, TimestampMixin):
    __tablename__ = "verdicts"
    id: Mapped[int] = mapped_column(primary_key=True)
    proposal_id: Mapped[int] = mapped_column(ForeignKey("proposals.id"), unique=True)
    decision: Mapped[str] = mapped_column(String(50)) # APPROVE, ESCALATE, BLOCK
    rule_triggered: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class Approval(Base, TimestampMixin):
    __tablename__ = "approvals"
    id: Mapped[int] = mapped_column(primary_key=True)
    verdict_id: Mapped[int] = mapped_column(ForeignKey("verdicts.id"), unique=True)
    approved_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(50)) # PENDING, APPROVED, REJECTED

class Order(Base, TimestampMixin):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    proposal_id: Mapped[int] = mapped_column(ForeignKey("proposals.id"))
    paypal_order_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(50))
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True)

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    # Append-only: no updated_at
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    event_type: Mapped[str] = mapped_column(String(255))
    payload: Mapped[dict] = mapped_column(JSON)
    # Hash-chaining for tamper evidence
    previous_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    current_hash: Mapped[str] = mapped_column(String(64), unique=True)

class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    status: Mapped[str] = mapped_column(String(50))

class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

class ApiKey(Base, TimestampMixin):
    __tablename__ = "api_keys"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    hashed_key: Mapped[str] = mapped_column(String(255), unique=True)

class WebhookEndpoint(Base, TimestampMixin):
    __tablename__ = "webhook_endpoints"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    url: Mapped[str] = mapped_column(String(1024))
    secret: Mapped[str] = mapped_column(String(255))

class WebhookDelivery(Base, TimestampMixin):
    __tablename__ = "webhook_deliveries"
    id: Mapped[int] = mapped_column(primary_key=True)
    endpoint_id: Mapped[int] = mapped_column(ForeignKey("webhook_endpoints.id"))
    event_type: Mapped[str] = mapped_column(String(255))
    payload: Mapped[dict] = mapped_column(JSON)
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=False)

class RedteamRun(Base, TimestampMixin):
    __tablename__ = "redteam_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50))

class RedteamResult(Base, TimestampMixin):
    __tablename__ = "redteam_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("redteam_runs.id"))
    scenario: Mapped[str] = mapped_column(String(255))
    payload: Mapped[str] = mapped_column(Text)
    passed: Mapped[bool] = mapped_column(Boolean)

class SpendLedger(Base, TimestampMixin):
    __tablename__ = "spend_ledger"
    id: Mapped[int] = mapped_column(primary_key=True)
    mandate_id: Mapped[int] = mapped_column(ForeignKey("mandates.id"))
    transaction_id: Mapped[Optional[int]] = mapped_column(ForeignKey("transactions.id"), nullable=True)
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    balance_after: Mapped[int] = mapped_column(BigInteger)
