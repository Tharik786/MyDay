import os
import re
import uuid
import json
from datetime import date, time, datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.models.task import Task, TaskStatus, TaskPriority
from app.schemas.task import PlanDayRequest, PlanDayItem, PlanDayResponse


class AIPlannerService:
    @staticmethod
    def _parse_time_str(t_str: str) -> time:
        parts = t_str.strip().split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        return time(hour=h, minute=m)

    @staticmethod
    def _time_to_minutes(t: time) -> int:
        return t.hour * 60 + t.minute

    @staticmethod
    def _minutes_to_time(minutes: int) -> time:
        minutes = max(0, min(1439, minutes))
        return time(hour=minutes // 60, minute=minutes % 60)

    @staticmethod
    def _find_free_slot(
        occupied_slots: List[Tuple[int, int]],
        duration_minutes: int,
        preferred_start_min: Optional[int],
        day_start_min: int,
        day_end_min: int
    ) -> Tuple[int, int]:
        """
        Finds a non-overlapping slot of duration `duration_minutes` within [day_start_min, day_end_min].
        occupied_slots is a list of (start_min, end_min) sorted by start_min.
        """
        # Sort occupied intervals
        sorted_slots = sorted(occupied_slots, key=lambda x: x[0])
        
        # Merge overlapping occupied slots
        merged: List[Tuple[int, int]] = []
        for s, e in sorted_slots:
            if not merged or merged[-1][1] < s:
                merged.append((s, e))
            else:
                merged[-1] = (merged[-1][0], max(merged[-1][1], e))

        # If user preferred a specific time, try to place it there or near there
        if preferred_start_min is not None:
            target_start = max(day_start_min, preferred_start_min)
            target_end = target_start + duration_minutes
            if target_end <= day_end_min:
                conflict = any(not (target_end <= s or target_start >= e) for s, e in merged)
                if not conflict:
                    return target_start, target_end

        # Search for first available free gap
        current = day_start_min
        for s, e in merged:
            if s > current:
                available = s - current
                if available >= duration_minutes:
                    return current, current + duration_minutes
            current = max(current, e)

        if day_end_min - current >= duration_minutes:
            return current, current + duration_minutes

        # If tight, fit in remaining or start of day
        return day_start_min, day_start_min + duration_minutes

    @staticmethod
    def _parse_duration_minutes(text: str) -> int:
        """Extracts duration from text like '3 hours', '90 mins', '45m', 'half an hour'"""
        lower = text.lower()
        
        # "half an hour" or "half hour"
        if "half an hour" in lower or "half hour" in lower or "30 min" in lower:
            return 30
        
        # Match "X hour(s)" or "X.Y hours" or "X hrs"
        hr_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)', lower)
        min_match = re.search(r'(\d+)\s*(?:minutes?|mins?|m\b)', lower)
        
        total_mins = 0
        if hr_match:
            total_mins += int(float(hr_match.group(1)) * 60)
        if min_match:
            total_mins += int(min_match.group(1))
            
        return total_mins if total_mins > 0 else 60  # Default 60 minutes

    @staticmethod
    def _parse_explicit_time(text: str) -> Optional[int]:
        """Extracts explicit time like 'at 3pm', 'at 10:30 am', 'at 14:00'"""
        lower = text.lower()
        
        # Match 'at 10:30am' or 'at 2pm' or '10:00'
        time_match = re.search(r'(?:at|by)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b', lower)
        if time_match:
            h_str, m_str, meridiem = time_match.groups()
            h = int(h_str)
            m = int(m_str) if m_str else 0
            if meridiem:
                if meridiem == 'pm' and h < 12:
                    h += 12
                elif meridiem == 'am' and h == 12:
                    h = 0
            elif h < 7:  # Assume afternoon if small number like '3' without am/pm
                h += 12
            if 0 <= h < 24 and 0 <= m < 60:
                return h * 60 + m
                
        # Keywords
        if "morning" in lower:
            return 9 * 60
        if "noon" in lower or "lunch" in lower:
            return 12 * 60
        if "afternoon" in lower:
            return 14 * 60
        if "evening" in lower:
            return 18 * 60
        if "night" in lower:
            return 20 * 60
            
        return None

    @staticmethod
    def _infer_priority(text: str) -> TaskPriority:
        lower = text.lower()
        if any(w in lower for w in ["urgent", "asap", "immediately", "critical", "emergency", "deadline"]):
            return TaskPriority.URGENT
        if any(w in lower for w in ["important", "exam", "study", "meeting", "doctor", "client", "physics", "math", "test"]):
            return TaskPriority.HIGH
        if any(w in lower for w in ["routine", "clean", "groceries", "walk", "stretch", "read", "relax", "laundry"]):
            return TaskPriority.LOW
        return TaskPriority.MEDIUM

    @classmethod
    async def plan_day(
        cls,
        db: AsyncSession,
        user_id: int,
        req: PlanDayRequest
    ) -> PlanDayResponse:
        target_date = req.plan_date or date.today()
        day_start_min = cls._time_to_minutes(cls._parse_time_str(req.day_start_time))
        day_end_min = cls._time_to_minutes(cls._parse_time_str(req.day_end_time))

        # 1. Fetch user's existing tasks for this date to avoid overlaps
        existing_stmt = select(Task).where(
            and_(
                Task.user_id == user_id,
                Task.start_date == target_date,
                Task.status.in_([TaskStatus.ACTIVE, TaskStatus.OVERDUE])
            )
        )
        existing_res = await db.execute(existing_stmt)
        existing_tasks = list(existing_res.scalars().all())

        # Collect occupied time windows (start_min, end_min)
        occupied_slots: List[Tuple[int, int]] = []
        conflict_notes: List[str] = []
        for t in existing_tasks:
            t_min = cls._time_to_minutes(t.start_time)
            # Default existing task duration assumed 45 min if not specified
            occupied_slots.append((t_min, t_min + 45))
            conflict_notes.append(f"Existing commitment: '{t.title}' at {t.start_time.strftime('%H:%M')}")

        # 2. Split user prompt into individual tasks/intentions
        raw_prompt = req.prompt.strip()
        
        # Check if an external LLM key is configured (OpenAI or Gemini)
        gemini_key = os.getenv("GEMINI_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        items: List[PlanDayItem] = []

        # If LLM key is available, attempt AI structured generation first
        if gemini_key or openai_key:
            try:
                items = await cls._generate_with_llm(
                    prompt=raw_prompt,
                    target_date=target_date,
                    existing_tasks=existing_tasks,
                    day_start_time=req.day_start_time,
                    day_end_time=req.day_end_time,
                    gemini_key=gemini_key,
                    openai_key=openai_key
                )
            except Exception as e:
                print(f"Notice: External LLM generation fallback to internal smart scheduler: {e}")
                items = []

        # Fallback to internal NLP smart scheduling engine if items is empty
        if not items:
            items = cls._heuristic_planner(
                raw_prompt=raw_prompt,
                target_date=target_date,
                occupied_slots=occupied_slots,
                day_start_min=day_start_min,
                day_end_min=day_end_min
            )

        summary_msg = f"Generated {len(items)} scheduled task(s) for {target_date.strftime('%B %d, %Y')} taking into account {len(existing_tasks)} existing commitment(s)."

        return PlanDayResponse(
            summary=summary_msg,
            plan_date=target_date,
            items=items,
            conflict_notes=conflict_notes
        )

    @classmethod
    def _heuristic_planner(
        cls,
        raw_prompt: str,
        target_date: date,
        occupied_slots: List[Tuple[int, int]],
        day_start_min: int,
        day_end_min: int
    ) -> List[PlanDayItem]:
        # Split sentences or lines
        delimiters = [r'\n+', r';', r'\band then\b', r'\bnext\b', r'\balso\b', r'\b,\s*(?=[A-Z0-9])']
        regex_pattern = '|'.join(delimiters)
        clauses = re.split(regex_pattern, raw_prompt, flags=re.IGNORECASE)
        
        cleaned_clauses = [c.strip() for c in clauses if c.strip() and len(c.strip()) > 3]
        if not cleaned_clauses:
            cleaned_clauses = [raw_prompt.strip()]

        current_occupied = list(occupied_slots)
        items: List[PlanDayItem] = []

        for clause in cleaned_clauses:
            duration = cls._parse_duration_minutes(clause)
            preferred_time = cls._parse_explicit_time(clause)
            priority = cls._infer_priority(clause)
            
            # Clean title
            title = clause
            title = re.sub(r'^(i need to|i have to|i want to|please|remind me to|schedule)\s+', '', title, flags=re.IGNORECASE)
            title = re.sub(r'\b(today|tomorrow|tonight)\b', '', title, flags=re.IGNORECASE)
            title = re.sub(r'\bfor \d+\s*(?:hours?|hrs?|minutes?|mins?)\b', '', title, flags=re.IGNORECASE)
            title = title.strip(' .,-')
            if not title:
                title = clause[:35]
            title = title[0].upper() + title[1:] if len(title) > 1 else title.upper()

            # Find free slot
            slot_start, slot_end = cls._find_free_slot(
                occupied_slots=current_occupied,
                duration_minutes=duration,
                preferred_start_min=preferred_time,
                day_start_min=day_start_min,
                day_end_min=day_end_min
            )

            current_occupied.append((slot_start, slot_end))
            start_time_val = cls._minutes_to_time(slot_start)

            # Check if alarm mode or smart escalation should be active
            reminder_mode = "ALARM" if priority == TaskPriority.URGENT or "alarm" in clause.lower() else "NOTIFICATION"
            smart_escalation = True if priority in (TaskPriority.URGENT, TaskPriority.HIGH) else False

            items.append(
                PlanDayItem(
                    id=str(uuid.uuid4()),
                    title=title,
                    description=f"Planned for {duration} mins based on your request: '{clause}'",
                    start_date=target_date,
                    start_time=start_time_val,
                    duration_minutes=duration,
                    priority=priority,
                    reminder_mode=reminder_mode,
                    smart_escalation=smart_escalation,
                    reasoning=f"Allocated {start_time_val.strftime('%H:%M')} for {duration} mins without overlap."
                )
            )

        # Sort generated items chronologically
        items.sort(key=lambda x: x.start_time)
        return items

    @classmethod
    async def _generate_with_llm(
        cls,
        prompt: str,
        target_date: date,
        existing_tasks: List[Task],
        day_start_time: str,
        day_end_time: str,
        gemini_key: Optional[str] = None,
        openai_key: Optional[str] = None
    ) -> List[PlanDayItem]:
        # Build prompt description
        existing_desc = ", ".join([f"'{t.title}' at {t.start_time.strftime('%H:%M')}" for t in existing_tasks])
        system_instruction = (
            "You are an expert AI Day Planner assistant. The user provides natural language tasks to schedule for today. "
            f"Target date is {target_date.isoformat()}. User's active day is from {day_start_time} to {day_end_time}. "
            f"User already has these existing tasks: [{existing_desc}]. "
            "Return a clean JSON array of scheduled items with keys: title, description, start_time (HH:MM), "
            "duration_minutes, priority (LOW/MEDIUM/HIGH/URGENT), reminder_mode (NOTIFICATION/ALARM), smart_escalation (true/false)."
        )

        async with httpx.AsyncClient(timeout=12.0) as client:
            if gemini_key:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                payload = {
                    "contents": [{
                        "parts": [{"text": f"{system_instruction}\n\nUser request: {prompt}\n\nRespond ONLY with valid JSON array."}]
                    }]
                }
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    text_content = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    json_str = re.search(r'\[.*\]', text_content, re.DOTALL)
                    if json_str:
                        raw_items = json.loads(json_str.group(0))
                        results: List[PlanDayItem] = []
                        for it in raw_items:
                            parts = it["start_time"].split(":")
                            results.append(
                                PlanDayItem(
                                    id=str(uuid.uuid4()),
                                    title=it.get("title", "Task"),
                                    description=it.get("description"),
                                    start_date=target_date,
                                    start_time=time(hour=int(parts[0]), minute=int(parts[1])),
                                    duration_minutes=it.get("duration_minutes", 60),
                                    priority=TaskPriority(it.get("priority", "MEDIUM")),
                                    reminder_mode=it.get("reminder_mode", "NOTIFICATION"),
                                    smart_escalation=bool(it.get("smart_escalation", False)),
                                    reasoning="Optimized by AI planner"
                                )
                            )
                        return results
        return []
