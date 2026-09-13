-- =========================================================
-- MyDay Mobile Task Scheduler - Supabase PostgreSQL Schema
-- Project: xczdiqizaweqszklsddm (MyDay)
-- =========================================================

-- 1. Create Custom Enum Types (if they don't exist)
DO $$ BEGIN
    CREATE TYPE recurrence_type AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM_INTERVAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE interval_unit AS ENUM ('MINUTES', 'HOURS', 'DAYS', 'WEEKS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE history_event_type AS ENUM (
        'CREATED', 'TRIGGERED', 'SNOOZED', 'RESCHEDULED', 
        'PAUSED', 'RESUMED', 'COMPLETED', 'OVERDUE', 'EDITED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    timezone VARCHAR(64) DEFAULT 'Asia/Kolkata' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Create Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    timezone VARCHAR(64) DEFAULT 'Asia/Kolkata' NOT NULL,
    recurrence_type recurrence_type DEFAULT 'ONE_TIME' NOT NULL,
    recurrence_days JSONB,
    interval_value INTEGER,
    interval_unit interval_unit,
    end_date DATE,
    status task_status DEFAULT 'ACTIVE' NOT NULL,
    priority task_priority DEFAULT 'MEDIUM' NOT NULL,
    lead_time_minutes INTEGER DEFAULT 0 NOT NULL,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    notification_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_next_run_at ON tasks(next_run_at);

-- 4. Create Task History Table
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    event_type history_event_type NOT NULL,
    event_time TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    details TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_user_id ON task_history(user_id);
CREATE INDEX IF NOT EXISTS idx_task_history_event_time ON task_history(event_time DESC);

-- 5. Enable Row Level Security (RLS) - Recommended on Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Allow service role / backend access to all tables
DO $$ BEGIN
    CREATE POLICY "Allow all access to service role" ON users FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow all access to service role" ON tasks FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow all access to service role" ON task_history FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
