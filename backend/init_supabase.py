"""
Helper script to initialize and verify tables directly in your Supabase PostgreSQL database.
Usage:
    python init_supabase.py
or:
    python init_supabase.py --password YOUR_SUPABASE_PASSWORD
"""

import os
import sys
import argparse
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_PROJECT_ID = os.getenv("SUPABASE_PROJECT_ID", "xczdiqizaweqszklsddm")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://xczdiqizaweqszklsddm.supabase.co")


async def run_migration(db_password: str = None, direct_url: str = None):
    try:
        import asyncpg
    except ImportError:
        print("[ERROR] asyncpg is not installed. Run: pip install asyncpg")
        sys.exit(1)

    password = db_password or os.getenv("SUPABASE_DB_PASSWORD")
    custom_url = direct_url or os.getenv("DATABASE_URL")

    connection_strings = []

    # If direct DATABASE_URL provided (and not sqlite), prioritize it
    if custom_url and "sqlite" not in custom_url:
        clean_url = custom_url.replace("postgresql+asyncpg://", "postgresql://")
        connection_strings.append(("DATABASE_URL from .env", clean_url))

    # Try standard Supabase direct connection
    if password:
        direct = f"postgresql://postgres:{password}@db.{SUPABASE_PROJECT_ID}.supabase.co:5432/postgres"
        pooler = f"postgresql://postgres.{SUPABASE_PROJECT_ID}:{password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
        connection_strings.append(("Supabase Direct (port 5432)", direct))
        connection_strings.append(("Supabase Session Pooler (port 6543)", pooler))

    if not connection_strings:
        print("=" * 65)
        print("[NOTICE] Supabase Database Password is not set yet.")
        print("=" * 65)
        print("To create tables directly in Supabase, you have two simple options:\n")
        print("OPTION 1 (Recommended - 30 seconds):")
        print("  1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/" + SUPABASE_PROJECT_ID)
        print("  2. Click on 'SQL Editor' in the left navigation menu.")
        print("  3. Copy all contents from 'supabase_schema.sql' and paste it in the SQL Editor.")
        print("  4. Click 'Run'. All tables (users, tasks, task_history) will be created immediately!\n")
        print("OPTION 2 (Using this script):")
        print("  Run this script with your database password:")
        print("  python init_supabase.py --password YOUR_DB_PASSWORD\n")
        print("  Or add SUPABASE_DB_PASSWORD=your_password into backend/.env")
        print("=" * 65)
        return

    schema_file = Path(__file__).resolve().parent / "supabase_schema.sql"
    if not schema_file.exists():
        print(f"[ERROR] Schema file not found at: {schema_file}")
        return

    sql_content = schema_file.read_text(encoding="utf-8")

    conn = None
    connected_name = None
    last_err = None

    print(f"Connecting to Supabase project ({SUPABASE_PROJECT_ID})...")
    for name, uri in connection_strings:
        try:
            print(f"-> Trying {name}...")
            # Set a 10s connection timeout
            conn = await asyncio.wait_for(asyncpg.connect(uri), timeout=10)
            connected_name = name
            print(f"[OK] Successfully connected via {name}!")
            break
        except Exception as e:
            last_err = e
            print(f"   Connection attempt failed: {e}")

    if not conn:
        print(f"\n[ERROR] Could not connect to Supabase database. Last error: {last_err}")
        print("\nTip: You can always create the tables directly by pasting 'backend/supabase_schema.sql'")
        print(f"into your Supabase SQL Editor: https://supabase.com/dashboard/project/{SUPABASE_PROJECT_ID}/sql/new")
        return

    try:
        print("\nExecuting supabase_schema.sql...")
        await conn.execute(sql_content)
        print("[SUCCESS] All SQL schema definitions applied!")

        # Verify created tables
        rows = await conn.fetch(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
        )
        tables = [r["table_name"] for r in rows]
        print(f"\nPublic tables currently in Supabase ({len(tables)}):")
        for t in tables:
            print(f"  ✓ {t}")

        expected = {"users", "tasks", "task_history"}
        found = expected.intersection(set(tables))
        if found == expected:
            print("\n[VERIFIED] All core MyDay tables (users, tasks, task_history) are present and ready!")
        else:
            missing = expected - set(tables)
            print(f"\n[WARNING] Some tables are missing: {missing}")
    except Exception as e:
        print(f"[ERROR] Executing schema failed: {e}")
    finally:
        await conn.close()


def main():
    parser = argparse.ArgumentParser(description="Initialize Supabase database tables for MyDay")
    parser.add_argument("--password", help="Supabase database password", default=None)
    parser.add_argument("--url", help="Direct DATABASE_URL connection string", default=None)
    args = parser.parse_args()

    asyncio.run(run_migration(db_password=args.password, direct_url=args.url))


if __name__ == "__main__":
    main()
