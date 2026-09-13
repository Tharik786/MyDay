# MyDay - Mobile Task Scheduler

**MyDay** is a mobile task and habit scheduling application built with a **FastAPI (Python) + PostgreSQL** backend API, a **React Native + Expo + TypeScript** mobile frontend, JWT authentication, an automated recurrence & timezone scheduling engine, task history audit logging, and local notifications that persist across device restarts.

---

## Features

- **Authentication**: JWT-based register and login with bcrypt password hashing and user profiles.
- **Task Management**: Create, edit, delete, pause/resume, snooze, reschedule, and complete tasks.
- **Rich Task Metadata**: Title, multiline description, date, time, timezone, lead-time reminder, and priority level (Low, Medium, High, Urgent).
- **Flexible Recurrence Scheduling**:
  - **One-Time**
  - **Daily**
  - **Weekly** (with custom weekday selection: Mon, Tue, Wed, Thu, Fri, Sat, Sun)
  - **Monthly** (handles varying month lengths cleanly)
  - **Yearly**
  - **Custom Intervals** (Every *N* Minutes, Hours, Days, or Weeks)
  - **End Dates** (automatically halts recurrence when reached)
- **Automatic `next_run_at` Engine**: Recalculates future run times upon creation, edits, completion, resumption, and rescheduling.
- **One-Tap Snooze & Reschedule**: Presets for 5m, 15m, 30m, 1h, 1d, or custom durations.
- **Task History Audit Log**: Chronological timeline of events (`CREATED`, `TRIGGERED`, `SNOOZED`, `RESCHEDULED`, `PAUSED`, `RESUMED`, `COMPLETED`, `OVERDUE`).
- **Restart-Proof Local Notifications**: Powered by `expo-notifications` with Android channels, vibration, and a background synchronization service that reconciles alarms on device reboots and app launches.
- **Mobile Screens**:
  - **Home**: Today's agenda, quick statistics, one-tap actions.
  - **Tasks**: Filter by status (`All`, `Active`, `Paused`, `Overdue`, `Completed`), search by title/notes, and sort by Due Date, Priority, or Alphabetical.
  - **Create / Edit Task**: Comprehensive recurrence picker, timezone selector, and reminder settings.
  - **Task Details**: Full overview, action buttons, and individual task history timeline.
  - **History**: Global audit trail with event filtering.
  - **Settings**: Profile, default timezone, dynamic API base URL configuration, and notification resync.

---

## Project Structure

```
DAY-App/
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (auth, tasks, history)
│   │   ├── core/            # Config, database session, JWT security
│   │   ├── models/          # SQLAlchemy models (User, Task, TaskHistory)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # Scheduling engine & TaskService
│   │   └── main.py          # FastAPI application entrypoint
│   ├── docker-compose.yml   # PostgreSQL Docker container
│   ├── requirements.txt     # Python dependencies
│   └── supabase_schema.sql  # Supabase PostgreSQL database schema script
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client with JWT interceptor & endpoints
│   │   ├── components/      # UI components (TaskCard, SnoozeModal, etc.)
│   │   ├── context/         # AuthContext and TaskContext
│   │   ├── notifications/   # Local notification manager & startup sync
│   │   ├── screens/         # Mobile screens (Home, Tasks, Create, Details, History, Settings)
│   │   ├── theme/           # Color tokens and design system
│   │   ├── types/           # TypeScript types and interfaces
│   │   └── utils/           # Date formatting and AsyncStorage helpers
│   ├── App.tsx              # Root application & tab navigator
│   ├── app.json             # Expo project configuration & permissions
│   ├── eas.json             # EAS Build profile for Android APK / AAB
│   └── package.json         # Frontend dependencies
│
└── README.md                # Documentation & build instructions
```

---

## Getting Started

### Prerequisites

- **Python**: 3.10+ (tested with 3.14)
- **Node.js**: 18+ (tested with v24)
- **npm** or **yarn**
- **Docker** (optional, for PostgreSQL container) or a local PostgreSQL instance

---

## 1. Backend Setup (FastAPI + PostgreSQL)

### Step 1: Set Up Virtual Environment

Open a terminal in `backend/`:

```bash
cd backend
python -m venv venv

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# On macOS/Linux:
source venv/bin/activate
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Database Configuration

#### Option A: Using Supabase PostgreSQL (Configured & Ready)

Your Supabase project is already connected in the codebase:
- **Project URL:** `https://xczdiqizaweqszklsddm.supabase.co`
- **Publishable/Anon Key:** `sb_publishable_Ri2xExiE4ZsziIq9zOCf-Q_8KIqz_8t`
- **Project ID:** `xczdiqizaweqszklsddm`

1. **Apply Tables via Supabase SQL Editor:**
   Open your Supabase Dashboard -> Click **SQL Editor** (the `>_` icon on the left sidebar) -> Paste the contents of [`backend/supabase_schema.sql`](file:///c:/Users/Admin/OneDrive/Desktop/DAY-App/backend/supabase_schema.sql) and click **Run**. This creates all tables (`users`, `tasks`, `task_history`), enums, and indexes.

2. **Set your Database Password:**
   In [`backend/.env`](file:///c:/Users/Admin/OneDrive/Desktop/DAY-App/backend/.env), set your database password:
   ```env
   SUPABASE_DB_PASSWORD=your_database_password_here
   ```
   Or set the direct connection URL obtained by clicking the green **Connect** button in your Supabase dashboard:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres.xczdiqizaweqszklsddm:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```

#### Option B: Using Local Docker PostgreSQL

```bash
docker-compose up -d
```

This launches a PostgreSQL 16 container at `localhost:5432` with user `postgres` and password `postgres`.

#### Option B: Using Existing / Remote PostgreSQL

Create a `.env` file in the `backend/` directory (see `.env.example`):

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/myday
SECRET_KEY=your_secure_random_jwt_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=43200
ALLOWED_ORIGINS=*
```

> **Note on SQLite Fallback:** If `DATABASE_URL` is not set or PostgreSQL is unavailable, the backend automatically falls back to an asynchronous SQLite database (`sqlite+aiosqlite:///./myday.db`) for immediate zero-config testing.

### Step 4: Run the Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API Base URL: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

---

## 2. Frontend Setup (React Native + Expo)

### Step 1: Install Dependencies

Open a new terminal in `frontend/`:

```bash
cd frontend
npm install
```

### Step 2: Configure API Endpoint

The app communicates with the FastAPI backend. You can configure the API URL in **Settings** inside the app, or edit `frontend/src/api/client.ts`:

- **Android Emulator**: `http://10.0.2.2:8000/api/v1`
- **iOS Simulator / Web**: `http://127.0.0.1:8000/api/v1`
- **Physical Device via Expo Go**: `http://<YOUR_PC_LAN_IP>:8000/api/v1` (e.g. `http://192.168.1.50:8000/api/v1`)

### Step 3: Start the Development Server

```bash
npx expo start
```

- **Physical Device**: Scan the QR code using the **Expo Go** app (Android) or Camera (iOS). Make sure your phone and computer are on the same Wi-Fi network.
- **Android Emulator**: Press `a` in the terminal.
- **Web Browser**: Press `w` in the terminal.

---

## 3. Local Notifications & Restart Sync

1. **Permissions**: When logging in, the app requests notification permissions automatically. You can also re-check and test permissions from the **Settings** screen.
2. **Android Channel**: Tasks are delivered via a high-priority channel (`myday-tasks`) with sound and vibration enabled.
3. **App / Device Restart Sync**:
   - Expo local notifications are registered with the OS alarm manager.
   - On app startup, `schedulerSync.syncWithTasks()` reconciles all active tasks, clears duplicate or obsolete alarms, and reschedules notifications for the upcoming 14-day window.
   - You can also manually trigger a full notification resync anytime via the **Settings -> Resync All Local Notifications** button.

---

## 4. Building Android APK & AAB

### Method 1: Using EAS Build (Cloud / Standalone APK)

EAS (Expo Application Services) is the standard tool to generate installable APKs or Google Play AABs.

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Build a standalone installable **Android APK** (for direct testing/distribution):
   ```bash
   cd frontend
   eas build -p android --profile preview
   ```
   *EAS will compile the project in the cloud and provide a direct download link for the `.apk` file.*

4. Build a **Google Play Store Android App Bundle (AAB)**:
   ```bash
   eas build -p android --profile production
   ```

### Method 2: Local Android Build (using Gradle)

If you have Android Studio and the Android SDK installed locally:

1. Generate native project files:
   ```bash
   cd frontend
   npx expo prebuild --platform android
   ```
2. Build the release APK with Gradle:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
3. The generated release APK will be located at:
   `frontend/android/app/build/outputs/apk/release/app-release.apk`

---

## 5. API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account & get JWT token |
| `POST` | `/api/v1/auth/login` | Log in with email and password |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile |
| `PUT` | `/api/v1/auth/me` | Update full name, timezone, or password |
| `GET` | `/api/v1/tasks` | List tasks (filters: `status`, `search`, `date_filter`) |
| `POST` | `/api/v1/tasks` | Create task with recurrence rules |
| `GET` | `/api/v1/tasks/summary` | Get task status counts (today, active, overdue, etc.) |
| `GET` | `/api/v1/tasks/{id}` | Get single task details |
| `PUT` | `/api/v1/tasks/{id}` | Update task schedule or fields |
| `DELETE` | `/api/v1/tasks/{id}` | Delete task |
| `POST` | `/api/v1/tasks/{id}/pause` | Pause task execution |
| `POST` | `/api/v1/tasks/{id}/resume` | Resume paused task and recalculate next run |
| `POST` | `/api/v1/tasks/{id}/snooze` | Snooze task for *N* minutes or until timestamp |
| `POST` | `/api/v1/tasks/{id}/reschedule`| Reschedule task to new date/time/timezone |
| `POST` | `/api/v1/tasks/{id}/complete` | Mark completed (advances recurring tasks) |
| `GET` | `/api/v1/history` | View audit logs (filter by `task_id`, `event_type`) |

---

## License

This project is open-source and available under the [MIT License](LICENSE).
