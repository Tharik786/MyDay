"""
Comprehensive end-to-end test of MyDay FastAPI backend with real data.
Tests Authentication, Task Creation, Recurrence, Snoozing, Completion, and History Audit logging.
"""

import sys
import time
import asyncio
from datetime import date, time as dtime, datetime, timedelta
import httpx
from app.main import app
from app.core.database import init_db


async def run_all_tests():
    print("=" * 70)
    print("      MYDAY BACKEND API - END-TO-END VERIFICATION WITH DATA")
    print("=" * 70)

    # 1. Initialize DB
    print("\n[STEP 1] Initializing database...")
    await init_db()
    print(" -> Database ready.")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 2. Health check
        print("\n[STEP 2] Testing System Health...")
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print(f" -> GET /health returned 200 OK: {res.json()}")

        # 3. User Registration
        timestamp = int(time.time())
        test_email = f"user_{timestamp}@myday.app"
        test_password = "SecurePassword123!"
        print(f"\n[STEP 3] Registering Test User: {test_email}...")

        reg_payload = {
            "email": test_email,
            "password": test_password,
            "full_name": "Test User",
            "timezone": "Asia/Kolkata"
        }
        res = await client.post("/api/v1/auth/register", json=reg_payload)
        assert res.status_code == 201, f"Registration failed: {res.text}"
        reg_data = res.json()
        token = reg_data["access_token"]
        user_id = reg_data["user"]["id"]
        print(f" -> User registered successfully! User ID: {user_id}")
        print(f" -> Received JWT Token: {token[:25]}... (valid)")

        headers = {"Authorization": f"Bearer {token}"}

        # 4. User Profile
        print("\n[STEP 4] Fetching User Profile (/api/v1/auth/me)...")
        res = await client.get("/api/v1/auth/me", headers=headers)
        assert res.status_code == 200, f"Get /me failed: {res.text}"
        profile = res.json()
        print(f" -> Profile confirmed: Name='{profile['full_name']}', Timezone='{profile['timezone']}'")

        # 5. Create Task 1: One-time Task
        print("\n[STEP 5] Creating Task 1: One-time Task (Urgent)...")
        today = date.today()
        task1_payload = {
            "title": "Review Mobile App Architecture",
            "description": "Review the React Native frontend and FastAPI backend integration.",
            "start_date": today.isoformat(),
            "start_time": "14:30:00",
            "timezone": "Asia/Kolkata",
            "recurrence_type": "ONE_TIME",
            "priority": "URGENT",
            "lead_time_minutes": 15
        }
        res = await client.post("/api/v1/tasks", json=task1_payload, headers=headers)
        assert res.status_code == 201, f"Create Task 1 failed: {res.text}"
        task1 = res.json()
        task1_id = task1["id"]
        print(f" -> Task 1 created! ID: {task1_id} | Title: '{task1['title']}' | Next Run: {task1['next_run_at']}")

        # 6. Create Task 2: Daily Recurring Task
        print("\n[STEP 6] Creating Task 2: Daily Recurring Habit...")
        task2_payload = {
            "title": "Morning Team Standup",
            "description": "Daily sync on task progress and blockers.",
            "start_date": today.isoformat(),
            "start_time": "09:30:00",
            "timezone": "Asia/Kolkata",
            "recurrence_type": "DAILY",
            "priority": "HIGH",
            "lead_time_minutes": 5
        }
        res = await client.post("/api/v1/tasks", json=task2_payload, headers=headers)
        assert res.status_code == 201, f"Create Task 2 failed: {res.text}"
        task2 = res.json()
        task2_id = task2["id"]
        print(f" -> Task 2 created! ID: {task2_id} | Recurrence: DAILY | Next Run: {task2['next_run_at']}")

        # 7. Create Task 3: Weekly Recurring Task
        print("\n[STEP 7] Creating Task 3: Weekly Task (Mon, Wed, Fri)...")
        task3_payload = {
            "title": "Gym Fitness Session",
            "description": "Strength and cardio training.",
            "start_date": today.isoformat(),
            "start_time": "18:00:00",
            "timezone": "Asia/Kolkata",
            "recurrence_type": "WEEKLY",
            "recurrence_days": [0, 2, 4],  # Mon, Wed, Fri
            "priority": "MEDIUM",
            "lead_time_minutes": 30
        }
        res = await client.post("/api/v1/tasks", json=task3_payload, headers=headers)
        assert res.status_code == 201, f"Create Task 3 failed: {res.text}"
        task3 = res.json()
        task3_id = task3["id"]
        print(f" -> Task 3 created! ID: {task3_id} | Days: Mon,Wed,Fri | Next Run: {task3['next_run_at']}")

        # 8. List All Tasks
        print("\n[STEP 8] Listing All Tasks for User (/api/v1/tasks)...")
        res = await client.get("/api/v1/tasks", headers=headers)
        assert res.status_code == 200, f"List tasks failed: {res.text}"
        tasks_list = res.json()
        print(f" -> Found {len(tasks_list)} active tasks:")
        for t in tasks_list:
            print(f"    - [ID: {t['id']}] {t['title']} | Status: {t['status']} | Priority: {t['priority']}")

        # 9. Task Summary Metrics
        print("\n[STEP 9] Fetching Task Summary Statistics (/api/v1/tasks/summary)...")
        res = await client.get("/api/v1/tasks/summary", headers=headers)
        assert res.status_code == 200, f"Get summary failed: {res.text}"
        summary = res.json()
        print(f" -> Summary Stats: Total={summary.get('total')}, Active={summary.get('active')}, Completed={summary.get('completed')}, Due Today={summary.get('due_today')}")

        # 10. Snooze a Task
        print(f"\n[STEP 10] Testing Snooze on Task {task1_id} (15 minutes)...")
        snooze_payload = {"duration_minutes": 15}
        res = await client.post(f"/api/v1/tasks/{task1_id}/snooze", json=snooze_payload, headers=headers)
        assert res.status_code == 200, f"Snooze failed: {res.text}"
        snoozed_task = res.json()
        print(f" -> Task {task1_id} snoozed successfully! Snoozed Until: {snoozed_task['snoozed_until']}")

        # 11. Complete Task 2 (Daily Recurrence check)
        print(f"\n[STEP 11] Completing Task 2 ({task2['title']}) to verify recurrence roll-forward...")
        res = await client.post(f"/api/v1/tasks/{task2_id}/complete", headers=headers)
        assert res.status_code == 200, f"Complete task failed: {res.text}"
        completed_task = res.json()
        print(f" -> Task marked complete! Recurrence advanced next run to: {completed_task['next_run_at']}")

        # 12. Check Task History Audit Trail
        print("\n[STEP 12] Inspecting Task History Audit Trail (/api/v1/history)...")
        res = await client.get("/api/v1/history", headers=headers)
        assert res.status_code == 200, f"Get history failed: {res.text}"
        history_items = res.json()
        print(f" -> Audit trail recorded {len(history_items)} history events:")
        for h in history_items:
            print(f"    - Event: {h['event_type']} on Task #{h['task_id']} | Details: {h.get('details')}")

        # 13. MyDay 2.0: Create Task with Smart Alarm, Smart Escalation, and Location
        print("\n[STEP 13] MyDay 2.0: Creating Smart Alarm & Location Reminder Task...")
        task_v2_payload = {
            "title": "Submit Quarterly Report",
            "description": "When arriving at office, submit the financial report.",
            "start_date": today.isoformat(),
            "start_time": "11:00:00",
            "timezone": "Asia/Kolkata",
            "recurrence_type": "ONE_TIME",
            "priority": "HIGH",
            "lead_time_minutes": 10,
            "reminder_mode": "ALARM",
            "alarm_sound": "radar",
            "smart_escalation": True,
            "is_location_based": True,
            "location_name": "Main Office",
            "location_lat": 12.9716,
            "location_lng": 77.5946,
            "location_radius": 200,
            "location_trigger": "ENTER"
        }
        res = await client.post("/api/v1/tasks", json=task_v2_payload, headers=headers)
        assert res.status_code == 201, f"Create MyDay 2.0 Task failed: {res.text}"
        task_v2 = res.json()
        assert task_v2["reminder_mode"] == "ALARM"
        assert task_v2["smart_escalation"] is True
        assert task_v2["is_location_based"] is True
        assert task_v2["location_name"] == "Main Office"
        print(f" -> MyDay 2.0 Task created! ID: {task_v2['id']} | Mode: {task_v2['reminder_mode']} | Escalation: {task_v2['smart_escalation']} | Location: {task_v2['location_name']}")

        # 14. MyDay 2.0: AI Daily Planner ("Plan My Day")
        print("\n[STEP 14] MyDay 2.0: Testing AI Daily Planner (/api/v1/tasks/plan-day)...")
        plan_prompt = "I need to study Physics for 3 hours today."
        res = await client.post("/api/v1/tasks/plan-day", json={"prompt": plan_prompt}, headers=headers)
        assert res.status_code == 200, f"Plan My Day failed: {res.text}"
        plan = res.json()
        assert len(plan["items"]) > 0, "Expected at least 1 planned item"
        print(f" -> AI Plan Generated successfully! Summary: {plan['summary']}")
        for it in plan["items"]:
            print(f"    - Planned: '{it['title']}' at {it['start_time']} for {it['duration_minutes']} mins (Priority: {it['priority']}, Mode: {it['reminder_mode']}, Escalation: {it['smart_escalation']})")

        # 15. MyDay 2.0: Batch Task Creation from AI Plan
        print("\n[STEP 15] MyDay 2.0: Testing Batch Task Creation from AI Plan (/api/v1/tasks/batch)...")
        batch_tasks = []
        for it in plan["items"]:
            formatted_time = it["start_time"] if len(it["start_time"]) == 8 else f"{it['start_time']}:00"
            batch_tasks.append({
                "title": it["title"],
                "description": it.get("description"),
                "start_date": it["start_date"],
                "start_time": formatted_time,
                "timezone": "Asia/Kolkata",
                "recurrence_type": "ONE_TIME",
                "priority": it["priority"],
                "lead_time_minutes": 10,
                "reminder_mode": it["reminder_mode"],
                "smart_escalation": it["smart_escalation"]
            })
        res = await client.post("/api/v1/tasks/batch", json={"tasks": batch_tasks}, headers=headers)
        assert res.status_code == 201, f"Batch creation failed: {res.text}"
        created_batch = res.json()
        assert len(created_batch) == len(batch_tasks)
        print(f" -> Batch created {len(created_batch)} tasks successfully!")

    print("\n" + "=" * 70)
    print("  [SUCCESS] ALL BACKEND API ENDPOINTS & MYDAY 2.0 FEATURES PASSED 100%!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
