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


def _migrate_tasks_table(conn):
    from sqlalchemy import inspect, text
    inspector = inspect(conn)
    existing_cols = {col["name"] for col in inspector.get_columns("tasks")}
    
    new_columns = [
        ("reminder_mode", "VARCHAR(32) DEFAULT 'NOTIFICATION'"),
        ("alarm_sound", "VARCHAR(64) DEFAULT 'default'"),
        ("smart_escalation", "BOOLEAN DEFAULT 0"),
        ("is_location_based", "BOOLEAN DEFAULT 0"),
        ("location_name", "VARCHAR(255)"),
        ("location_lat", "FLOAT"),
        ("location_lng", "FLOAT"),
        ("location_radius", "INTEGER DEFAULT 200"),
        ("location_trigger", "VARCHAR(32) DEFAULT 'ENTER'"),
    ]
    
    for col_name, col_type in new_columns:
        if col_name not in existing_cols:
            try:
                conn.execute(text(f"ALTER TABLE tasks ADD COLUMN {col_name} {col_type}"))
                print(f" -> Migrated tasks table: added column {col_name}")
            except Exception as e:
                print(f" -> Notice: Could not add column {col_name} (might already exist): {e}")


async def init_db():
    # Import all models here so they are registered with Base.metadata
    from app.models.user import User
    from app.models.task import Task
    from app.models.history import TaskHistory

    db_target = "Supabase PostgreSQL" if "postgresql" in str(engine.url) else "local SQLite fallback (myday.db)"
    print(f"--> Initializing database tables on: {db_target}")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate_tasks_table)
    print(f"--> Database tables ready on: {db_target}")
