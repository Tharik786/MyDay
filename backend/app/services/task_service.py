from datetime import datetime, timezone, date, time
from typing import Optional, List, Sequence
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.task import Task, TaskStatus, RecurrenceType, TaskPriority
from app.models.history import TaskHistory, HistoryEventType
from app.schemas.task import TaskCreate, TaskUpdate, SnoozeRequest, RescheduleRequest
from app.services.scheduler_engine import (
    calculate_next_run_at, 
    calculate_snooze_time, 
    evaluate_task_status
)


class TaskService:
    @staticmethod
    async def log_history(
        db: AsyncSession,
        task_id: int,
        user_id: int,
        event_type: HistoryEventType,
        details: str
    ) -> TaskHistory:
        history = TaskHistory(
            task_id=task_id,
            user_id=user_id,
            event_type=event_type,
            details=details,
            event_time=datetime.now(timezone.utc)
        )
        db.add(history)
        return history

    @staticmethod
    async def create_task(db: AsyncSession, user_id: int, task_in: TaskCreate) -> Task:
        now_utc = datetime.now(timezone.utc)

        # Calculate initial next_run_at
        next_run = calculate_next_run_at(
            start_date=task_in.start_date,
            start_time=task_in.start_time,
            tz_name=task_in.timezone,
            recurrence_type=task_in.recurrence_type,
            recurrence_days=task_in.recurrence_days,
            interval_value=task_in.interval_value,
            interval_unit=task_in.interval_unit,
            end_date=task_in.end_date,
            from_time_utc=now_utc
        )

        initial_status = TaskStatus.ACTIVE
        if next_run is None:
            initial_status = TaskStatus.COMPLETED
        elif next_run < now_utc and task_in.recurrence_type == RecurrenceType.ONE_TIME:
            initial_status = TaskStatus.OVERDUE

        task = Task(
            user_id=user_id,
            title=task_in.title,
            description=task_in.description,
            start_date=task_in.start_date,
            start_time=task_in.start_time,
            timezone=task_in.timezone,
            recurrence_type=task_in.recurrence_type,
            recurrence_days=task_in.recurrence_days,
            interval_value=task_in.interval_value,
            interval_unit=task_in.interval_unit,
            end_date=task_in.end_date,
            priority=task_in.priority,
            lead_time_minutes=task_in.lead_time_minutes,
            status=initial_status,
            next_run_at=next_run,
            # MyDay 2.0
            reminder_mode=task_in.reminder_mode,
            alarm_sound=task_in.alarm_sound,
            smart_escalation=task_in.smart_escalation,
            is_location_based=task_in.is_location_based,
            location_name=task_in.location_name,
            location_lat=task_in.location_lat,
            location_lng=task_in.location_lng,
            location_radius=task_in.location_radius,
            location_trigger=task_in.location_trigger
        )
        db.add(task)
        await db.flush()

        # Log creation
        await TaskService.log_history(
            db=db,
            task_id=task.id,
            user_id=user_id,
            event_type=HistoryEventType.CREATED,
            details=f"Task '{task.title}' created with recurrence '{task.recurrence_type}'. Mode: {task.reminder_mode}. Next run: {next_run}."
        )

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def create_batch_tasks(db: AsyncSession, user_id: int, tasks_in: List[TaskCreate]) -> List[Task]:
        created_tasks: List[Task] = []
        for t_in in tasks_in:
            task = await TaskService.create_task(db, user_id, t_in)
            created_tasks.append(task)
        return created_tasks

    @staticmethod
    async def get_task_by_id(db: AsyncSession, task_id: int, user_id: int) -> Task:
        result = await db.execute(
            select(Task).where(and_(Task.id == task_id, Task.user_id == user_id))
        )
        task = result.scalars().first()
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        # Evaluate status if active/overdue
        now_utc = datetime.now(timezone.utc)
        evaluated = evaluate_task_status(task.status, task.next_run_at, now_utc)
        if evaluated != task.status:
            task.status = evaluated
            await db.commit()
            await db.refresh(task)

        return task

    @staticmethod
    async def list_tasks(
        db: AsyncSession,
        user_id: int,
        status_filter: Optional[TaskStatus] = None,
        search: Optional[str] = None,
        date_filter: Optional[date] = None
    ) -> List[Task]:
        query = select(Task).where(Task.user_id == user_id)

        if status_filter:
            query = query.where(Task.status == status_filter)

        if search:
            query = query.where(
                or_(
                    Task.title.ilike(f"%{search}%"),
                    Task.description.ilike(f"%{search}%")
                )
            )

        if date_filter:
            query = query.where(Task.start_date == date_filter)

        # Order by next_run_at ascending, nulls last
        query = query.order_by(Task.next_run_at.asc().nulls_last())

        result = await db.execute(query)
        tasks = list(result.scalars().all())

        now_utc = datetime.now(timezone.utc)
        # Check and update overdue items
        updated = False
        for t in tasks:
            new_status = evaluate_task_status(t.status, t.next_run_at, now_utc)
            if new_status != t.status:
                t.status = new_status
                updated = True

        if updated:
            await db.commit()

        return tasks

    @staticmethod
    async def update_task(
        db: AsyncSession,
        task_id: int,
        user_id: int,
        task_in: TaskUpdate
    ) -> Task:
        task = await TaskService.get_task_by_id(db, task_id, user_id)
        now_utc = datetime.now(timezone.utc)

        update_data = task_in.model_dump(exclude_unset=True)

        schedule_changed = any(
            field in update_data for field in [
                "start_date", "start_time", "timezone", "recurrence_type",
                "recurrence_days", "interval_value", "interval_unit", "end_date"
            ]
        )

        for field, value in update_data.items():
            setattr(task, field, value)

        if schedule_changed and task.status != TaskStatus.PAUSED:
            next_run = calculate_next_run_at(
                start_date=task.start_date,
                start_time=task.start_time,
                tz_name=task.timezone,
                recurrence_type=task.recurrence_type,
                recurrence_days=task.recurrence_days,
                interval_value=task.interval_value,
                interval_unit=task.interval_unit,
                end_date=task.end_date,
                from_time_utc=now_utc,
                last_run_at=task.last_run_at
            )
            task.next_run_at = next_run
            task.status = evaluate_task_status(task.status, next_run, now_utc)

        await TaskService.log_history(
            db=db,
            task_id=task.id,
            user_id=user_id,
            event_type=HistoryEventType.EDITED,
            details=f"Task updated. Next run: {task.next_run_at}."
        )

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def pause_task(db: AsyncSession, task_id: int, user_id: int) -> Task:
        task = await TaskService.get_task_by_id(db, task_id, user_id)
        task.status = TaskStatus.PAUSED

        await TaskService.log_history(
            db=db,
            task_id=task.id,
            user_id=user_id,
            event_type=HistoryEventType.PAUSED,
            details=f"Task paused at {datetime.now(timezone.utc)}."
        )

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def resume_task(db: AsyncSession, task_id: int, user_id: int) -> Task:
        task = await TaskService.get_task_by_id(db, task_id, user_id)
        now_utc = datetime.now(timezone.utc)

        # Recalculate next run starting from now
        next_run = calculate_next_run_at(
            start_date=task.start_date,
            start_time=task.start_time,
            tz_name=task.timezone,
            recurrence_type=task.recurrence_type,
            recurrence_days=task.recurrence_days,
            interval_value=task.interval_value,
            interval_unit=task.interval_unit,
            end_date=task.end_date,
            from_time_utc=now_utc,
            last_run_at=task.last_run_at
        )

        task.next_run_at = next_run
        task.status = TaskStatus.ACTIVE if next_run else TaskStatus.COMPLETED

        await TaskService.log_history(
            db=db,
            task_id=task.id,
            user_id=user_id,
            event_type=HistoryEventType.RESUMED,
            details=f"Task resumed. Next run: {next_run}."
        )

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def snooze_task(
        db: AsyncSession,
        task_id: int,
        user_id: int,
        snooze_in: SnoozeRequest
    ) -> Task:
        task = await TaskService.get_task_by_id(db, task_id, user_id)
        now_utc = datetime.now(timezone.utc)

        snooze_target = calculate_snooze_time(
            duration_minutes=snooze_in.duration_minutes,
            snooze_until=snooze_in.snooze_until,
            from_time_utc=now_utc
        )

        task.snoozed_until = snooze_target
        task.next_run_at = snooze_target
        task.status = TaskStatus.ACTIVE

        await TaskService.log_history(
            db=db,
            task_id=task.id,
            user_id=user_id,
            event_type=HistoryEventType.SNOOZED,
            details=f"Task snoozed until {snooze_target}."
        )

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def reschedule_task(
        db: AsyncSession,
        task_id: int,
        user_id: int,
        reschedule_in: RescheduleRequest
    ) -> Task:
        task = await TaskService.get_task_by_id(db, task_id, user_id)
        now_utc = datetime.now(timezone.utc)

        task.start_date = reschedule_in.new_date
        task.start_time = reschedule_in.new_time
        if reschedule_in.new_timezone:
            task.timezone = reschedule_in.new_timezone

        task.snoozed_until = None

        next_run = calculate_next_run_at(
            start_date=task.start_date,
            start_time=task.start_time,
            tz_name=task.timezone,
            recurrence_type=task.recurrence_type,
            recurrence_days=task.recurrence_days,
            interval_value=task.interval_value,
            interval_unit=task.interval_unit,
            end_date=task.end_date,
            from_time_utc=now_utc
        )

        task.next_run_at = next_run
        task.status = TaskStatus.ACTIVE if next_run else TaskStatus.COMPLETED

        await TaskService.log_history(
            db=db,
            task_id=task.id,
            user_id=user_id,
            event_type=HistoryEventType.RESCHEDULED,
            details=f"Task rescheduled to {task.start_date} {task.start_time} ({task.timezone}). Next run: {next_run}."
        )

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def complete_task(db: AsyncSession, task_id: int, user_id: int) -> Task:
        task = await TaskService.get_task_by_id(db, task_id, user_id)
        now_utc = datetime.now(timezone.utc)

        task.last_run_at = now_utc
        task.snoozed_until = None

        if task.recurrence_type == RecurrenceType.ONE_TIME:
            task.status = TaskStatus.COMPLETED
            task.next_run_at = None
            details = "One-time task marked as completed."
        else:
            # Advance recurring task to next slot
            next_run = calculate_next_run_at(
                start_date=task.start_date,
                start_time=task.start_time,
                tz_name=task.timezone,
                recurrence_type=task.recurrence_type,
                recurrence_days=task.recurrence_days,
                interval_value=task.interval_value,
                interval_unit=task.interval_unit,
                end_date=task.end_date,
                from_time_utc=now_utc,
                last_run_at=now_utc
            )
            task.next_run_at = next_run
            if next_run is None:
                task.status = TaskStatus.COMPLETED
                details = "Recurring task reached end date and marked completed."
            else:
                task.status = TaskStatus.ACTIVE
                details = f"Task completed for this occurrence. Next run advanced to {next_run}."

        await TaskService.log_history(
            db=db,
            task_id=task.id,
            user_id=user_id,
            event_type=HistoryEventType.COMPLETED,
            details=details
        )

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def delete_task(db: AsyncSession, task_id: int, user_id: int) -> bool:
        task = await TaskService.get_task_by_id(db, task_id, user_id)
        await db.delete(task)
        await db.commit()
        return True

    @staticmethod
    async def get_task_summary(db: AsyncSession, user_id: int) -> dict:
        now_utc = datetime.now(timezone.utc)
        today_date = now_utc.date()

        # Update overdue statuses
        tasks_res = await db.execute(select(Task).where(Task.user_id == user_id))
        all_tasks = list(tasks_res.scalars().all())

        total = len(all_tasks)
        active = 0
        paused = 0
        completed = 0
        overdue = 0
        today_due = 0

        for t in all_tasks:
            evaluated = evaluate_task_status(t.status, t.next_run_at, now_utc)
            if evaluated != t.status:
                t.status = evaluated

            if t.status == TaskStatus.ACTIVE:
                active += 1
            elif t.status == TaskStatus.PAUSED:
                paused += 1
            elif t.status == TaskStatus.COMPLETED:
                completed += 1
            elif t.status == TaskStatus.OVERDUE:
                overdue += 1

            if t.next_run_at and t.next_run_at.date() == today_date and t.status in (TaskStatus.ACTIVE, TaskStatus.OVERDUE):
                today_due += 1

        await db.commit()

        return {
            "total": total,
            "active": active,
            "paused": paused,
            "completed": completed,
            "overdue": overdue,
            "today_due": today_due
        }
