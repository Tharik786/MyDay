from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_serializer
from app.models.history import HistoryEventType


class TaskHistoryResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    event_type: HistoryEventType
    event_time: datetime
    details: Optional[str] = None
    task_title: Optional[str] = None

    @field_serializer("event_time", mode="plain", check_fields=False)
    def serialize_dt(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    model_config = ConfigDict(from_attributes=True)
