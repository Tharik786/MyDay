from datetime import date, time, datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_serializer
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
    
    # MyDay 2.0 Features
    reminder_mode: str = "NOTIFICATION"  # NOTIFICATION | ALARM
    alarm_sound: str = "default"
    smart_escalation: bool = False
    is_location_based: bool = False
    location_name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_radius: Optional[int] = 200
    location_trigger: Optional[str] = "ENTER"


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
    
    # MyDay 2.0
    reminder_mode: Optional[str] = None
    alarm_sound: Optional[str] = None
    smart_escalation: Optional[bool] = None
    is_location_based: Optional[bool] = None
    location_name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_radius: Optional[int] = None
    location_trigger: Optional[str] = None


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

    @field_serializer("next_run_at", "last_run_at", "snoozed_until", "created_at", "updated_at", mode="plain", check_fields=False)
    def serialize_dt(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)


class TaskSummaryResponse(BaseModel):
    total: int
    active: int
    paused: int
    completed: int
    overdue: int
    today_due: int


# ==========================================
# MyDay 2.0: AI Daily Planner Schemas
# ==========================================

class PlanDayRequest(BaseModel):
    prompt: str = Field(..., min_length=2, description="Natural language daily tasks description")
    plan_date: Optional[date] = Field(None, description="Date to schedule for (defaults to today)")
    day_start_time: str = Field("08:00", description="Start of active day (HH:MM)")
    day_end_time: str = Field("22:00", description="End of active day (HH:MM)")
    timezone: str = Field("Asia/Kolkata", description="User timezone")


class PlanDayItem(BaseModel):
    id: Optional[str] = None  # Temporary ID for UI tracking
    title: str
    description: Optional[str] = None
    start_date: date
    start_time: time
    duration_minutes: int = 60
    priority: TaskPriority = TaskPriority.MEDIUM
    reminder_mode: str = "NOTIFICATION"
    smart_escalation: bool = False
    reasoning: Optional[str] = None


class PlanDayResponse(BaseModel):
    summary: str
    plan_date: date
    items: List[PlanDayItem]
    conflict_notes: Optional[List[str]] = []


class BatchTaskCreateRequest(BaseModel):
    tasks: List[TaskCreate]

