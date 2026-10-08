import os

from sqlalchemy.ext.asyncio import AsyncAttrs, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./mandate.db")

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(AsyncAttrs, DeclarativeBase):
    pass

class AuditEventDB(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[str]
    timestamp: Mapped[str]
    event_type: Mapped[str]
    summary: Mapped[str]
    verdict: Mapped[str]
    rule_id: Mapped[str]
    reasoning: Mapped[str]
    # In a real app, tool_calls would be a JSON/JSONB column
    tool_calls: Mapped[str] 

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
