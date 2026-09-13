from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Database URL adjustment for Supabase / asyncpg
db_url = settings.DATABASE_URL

# If user provided a SUPABASE_DB_PASSWORD and hasn't set custom DATABASE_URL, connect directly to Supabase Postgres
if settings.SUPABASE_DB_PASSWORD and "sqlite" in db_url:
    db_url = f"postgresql+asyncpg://postgres.{settings.SUPABASE_PROJECT_ID}:{settings.SUPABASE_DB_PASSWORD}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# SQLite specific connect args if using SQLite
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=connect_args,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    # Import all models here so they are registered with Base.metadata
    from app.models.user import User
    from app.models.task import Task
    from app.models.history import TaskHistory

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
