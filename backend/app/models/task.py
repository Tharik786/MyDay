import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Date, Time, DateTime, 
    ForeignKey, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class RecurrenceType(str, enum.Enum):
    ONE_TIME = "ONE_TIME"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"
    CUSTOM_INTERVAL = "CUSTOM_INTERVAL"


class IntervalUnit(str, enum.Enum):
    MINUTES = "MINUTES"
    HOURS = "HOURS"
    DAYS = "DAYS"
    WEEKS = "WEEKS"


class TaskStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Schedule anchor
    start_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    timezone = Column(String(64), default="Asia/Kolkata", nullable=False)
    
    # Recurrence rules
    recurrence_type = Column(SQLEnum(RecurrenceType), default=RecurrenceType.ONE_TIME, nullable=False)
    recurrence_days = Column(JSON, nullable=True)  # List of weekdays e.g. [0, 2, 4] for Mon, Wed, Fri
    interval_value = Column(Integer, nullable=True)  # e.g., 15 for every 15 minutes, 2 for every 2 weeks
    interval_unit = Column(SQLEnum(IntervalUnit), nullable=True)
    end_date = Column(Date, nullable=True)
    
    # Operational status
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.ACTIVE, nullable=False, index=True)
    priority = Column(SQLEnum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    lead_time_minutes = Column(Integer, default=0, nullable=False)  # Notify N minutes before event
    
    # Calculated timestamps (stored in UTC)
    next_run_at = Column(DateTime(timezone=True), nullable=True, index=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    snoozed_until = Column(DateTime(timezone=True), nullable=True)
    notification_id = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="tasks")
    history = relationship("TaskHistory", back_populates="task", cascade="all, delete-orphan", order_by="desc(TaskHistory.event_time)")
