import calendar
from datetime import datetime, date, time, timedelta, timezone
from typing import Optional, List
from zoneinfo import ZoneInfo

from app.models.task import RecurrenceType, IntervalUnit, TaskStatus


def get_timezone(tz_name: Optional[str]) -> ZoneInfo:
    if not tz_name:
        return ZoneInfo("UTC")
    try:
        return ZoneInfo(tz_name)
    except Exception:
        return ZoneInfo("UTC")


def combine_to_utc(d: date, t: time, tz_name: str) -> datetime:
    tz = get_timezone(tz_name)
    # Construct local datetime
    local_dt = datetime.combine(d, t).replace(tzinfo=tz)
    return local_dt.astimezone(timezone.utc)


def add_months(source_date: date, months: int) -> date:
    month = source_date.month - 1 + months
    year = source_date.year + month // 12
    month = month % 12 + 1
    max_day = calendar.monthrange(year, month)[1]
    day = min(source_date.day, max_day)
    return date(year, month, day)


def calculate_next_run_at(
    start_date: date,
    start_time: time,
    tz_name: str,
    recurrence_type: RecurrenceType,
    recurrence_days: Optional[List[int]] = None,
    interval_value: Optional[int] = None,
    interval_unit: Optional[IntervalUnit] = None,
    end_date: Optional[date] = None,
    from_time_utc: Optional[datetime] = None,
    last_run_at: Optional[datetime] = None
) -> Optional[datetime]:
    """
    Calculates the next upcoming execution time in UTC for a task.
    Returns None if recurrence has ended (e.g. exceeded end_date).
    """
    tz = get_timezone(tz_name)
    if from_time_utc is None:
        from_time_utc = datetime.now(timezone.utc)
    elif from_time_utc.tzinfo is None:
        from_time_utc = from_time_utc.replace(tzinfo=timezone.utc)
        
    if last_run_at is not None and last_run_at.tzinfo is None:
        last_run_at = last_run_at.replace(tzinfo=timezone.utc)
    
    from_local = from_time_utc.astimezone(tz)
    start_local = datetime.combine(start_date, start_time).replace(tzinfo=tz)
    start_utc = start_local.astimezone(timezone.utc)

    # 1. ONE_TIME
    if recurrence_type == RecurrenceType.ONE_TIME:
        if last_run_at is not None:
            # Already executed once
            return None
        return start_utc

    # Check if beyond end_date already
    if end_date:
        end_local = datetime.combine(end_date, time(23, 59, 59)).replace(tzinfo=tz)
        if from_local > end_local:
            return None

    # 2. DAILY
    if recurrence_type == RecurrenceType.DAILY:
        # Check today's slot
        candidate_date = max(start_date, from_local.date())
        candidate_local = datetime.combine(candidate_date, start_time).replace(tzinfo=tz)
        if candidate_local <= from_local:
            candidate_date += timedelta(days=1)
            candidate_local = datetime.combine(candidate_date, start_time).replace(tzinfo=tz)
        
        if end_date and candidate_date > end_date:
            return None
        return candidate_local.astimezone(timezone.utc)

    # 3. WEEKLY
    if recurrence_type == RecurrenceType.WEEKLY:
        # Days of week: 0=Monday, 6=Sunday
        days = recurrence_days if (recurrence_days and len(recurrence_days) > 0) else [start_date.weekday()]
        days = sorted(list(set(days)))

        candidate_date = max(start_date, from_local.date())
        # Look ahead up to 14 days to find the next matching day
        for offset in range(15):
            test_date = candidate_date + timedelta(days=offset)
            if test_date.weekday() in days:
                candidate_local = datetime.combine(test_date, start_time).replace(tzinfo=tz)
                if candidate_local > from_local:
                    if end_date and test_date > end_date:
                        return None
                    return candidate_local.astimezone(timezone.utc)
        return None

    # 4. MONTHLY
    if recurrence_type == RecurrenceType.MONTHLY:
        # Match day of month or clamp
        target_day = start_date.day
        curr_year = max(start_date.year, from_local.year)
        curr_month = from_local.month if curr_year == from_local.year else 1

        for m_offset in range(25):  # Look up to 2 years ahead
            dt_base = date(curr_year, curr_month, 1)
            month_date = add_months(dt_base, m_offset)
            max_d = calendar.monthrange(month_date.year, month_date.month)[1]
            actual_day = min(target_day, max_d)
            candidate_date = date(month_date.year, month_date.month, actual_day)

            if candidate_date < start_date:
                continue

            candidate_local = datetime.combine(candidate_date, start_time).replace(tzinfo=tz)
            if candidate_local > from_local:
                if end_date and candidate_date > end_date:
                    return None
                return candidate_local.astimezone(timezone.utc)
        return None

    # 5. YEARLY
    if recurrence_type == RecurrenceType.YEARLY:
        target_month = start_date.month
        target_day = start_date.day
        curr_year = max(start_date.year, from_local.year)

        for y_offset in range(10):  # Look up to 10 years ahead
            y = curr_year + y_offset
            max_d = calendar.monthrange(y, target_month)[1]
            actual_day = min(target_day, max_d)
            candidate_date = date(y, target_month, actual_day)

            if candidate_date < start_date:
                continue

            candidate_local = datetime.combine(candidate_date, start_time).replace(tzinfo=tz)
            if candidate_local > from_local:
                if end_date and candidate_date > end_date:
                    return None
                return candidate_local.astimezone(timezone.utc)
        return None

    # 6. CUSTOM_INTERVAL (every N minutes, hours, days, or weeks)
    if recurrence_type == RecurrenceType.CUSTOM_INTERVAL:
        val = interval_value if (interval_value and interval_value > 0) else 1
        unit = interval_unit or IntervalUnit.DAYS

        if unit == IntervalUnit.MINUTES:
            step = timedelta(minutes=val)
        elif unit == IntervalUnit.HOURS:
            step = timedelta(hours=val)
        elif unit == IntervalUnit.DAYS:
            step = timedelta(days=val)
        elif unit == IntervalUnit.WEEKS:
            step = timedelta(weeks=val)
        else:
            step = timedelta(days=val)

        # Anchor is start_utc
        if start_utc > from_time_utc:
            candidate_utc = start_utc
        else:
            # How many intervals have passed
            diff_seconds = (from_time_utc - start_utc).total_seconds()
            step_seconds = step.total_seconds()
            if step_seconds <= 0:
                step_seconds = 60
            steps_needed = int(diff_seconds // step_seconds) + 1
            candidate_utc = start_utc + timedelta(seconds=steps_needed * step_seconds)

        if end_date:
            candidate_local = candidate_utc.astimezone(tz)
            if candidate_local.date() > end_date:
                return None

        return candidate_utc

    return None


def calculate_snooze_time(
    duration_minutes: Optional[int] = None,
    snooze_until: Optional[datetime] = None,
    from_time_utc: Optional[datetime] = None
) -> datetime:
    """
    Calculates the snooze target time in UTC.
    """
    if from_time_utc is None:
        from_time_utc = datetime.now(timezone.utc)

    if snooze_until:
        if snooze_until.tzinfo is None:
            return snooze_until.replace(tzinfo=timezone.utc)
        return snooze_until.astimezone(timezone.utc)

    minutes = duration_minutes if (duration_minutes and duration_minutes > 0) else 15
    return from_time_utc + timedelta(minutes=minutes)


def evaluate_task_status(
    status: TaskStatus,
    next_run_at: Optional[datetime],
    now_utc: Optional[datetime] = None
) -> TaskStatus:
    """
    Evaluates whether an ACTIVE task has become OVERDUE or remains ACTIVE/COMPLETED/PAUSED.
    """
    if status in (TaskStatus.PAUSED, TaskStatus.COMPLETED):
        return status

    if next_run_at is None:
        return TaskStatus.COMPLETED

    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    elif now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=timezone.utc)

    if next_run_at.tzinfo is None:
        next_run_at = next_run_at.replace(tzinfo=timezone.utc)

    if next_run_at < now_utc:
        return TaskStatus.OVERDUE

    return TaskStatus.ACTIVE
