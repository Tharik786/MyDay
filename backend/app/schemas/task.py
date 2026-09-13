from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.task import RecurrenceType, IntervalUnit, TaskStatus, TaskPriority


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: date
    start_time: time
    timezone: str = "Asia/Kolkata"
    recurrence_type: RecurrenceType = RecurrenceType.ONE_TIME
    recurrence_days: Optional[List[int]] = None  # 0=Monday, 6=Sunday
    interval_value: Optional[int] = Field(None, ge=1)
    interval_unit: Optional[IntervalUnit] = None
    end_date: Optional[date] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    lead_time_minutes: int = Field(0, ge=0)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: Optional[date] = None
    start_time: Optional[time] = None
    timezone: Optional[str] = None
    recurrence_type: Optional[RecurrenceType] = None
    recurrence_days: Optional[List[int]] = None
    interval_value: Optional[int] = Field(None, ge=1)
    interval_unit: Optional[IntervalUnit] = None
    end_date: Optional[date] = None
    priority: Optional[TaskPriority] = None
    lead_time_minutes: Optional[int] = Field(None, ge=0)
    status: Optional[TaskStatus] = None


class SnoozeRequest(BaseModel):
    duration_minutes: Optional[int] = Field(None, ge=1)
    snooze_until: Optional[datetime] = None


class RescheduleRequest(BaseModel):
    new_date: date
    new_time: time
    new_timezone: Optional[str] = None


class NotificationIdUpdate(BaseModel):
    notification_id: str


class TaskResponse(TaskBase):
    id: int
    user_id: int
    status: TaskStatus
    next_run_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    snoozed_until: Optional[datetime] = None
    notification_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskSummaryResponse(BaseModel):
    total: int
    active: int
    paused: int
    completed: int
    overdue: int
    today_due: int
