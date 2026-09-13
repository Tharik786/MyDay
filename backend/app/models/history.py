import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class HistoryEventType(str, enum.Enum):
    CREATED = "CREATED"
    TRIGGERED = "TRIGGERED"
    SNOOZED = "SNOOZED"
    RESCHEDULED = "RESCHEDULED"
    PAUSED = "PAUSED"
    RESUMED = "RESUMED"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"
    EDITED = "EDITED"


class TaskHistory(Base):
    __tablename__ = "task_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    event_type = Column(SQLEnum(HistoryEventType), nullable=False)
    event_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    details = Column(Text, nullable=True)

    task = relationship("Task", back_populates="history")
    user = relationship("User", back_populates="histories")
