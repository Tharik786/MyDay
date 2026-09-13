from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.history import HistoryEventType


class TaskHistoryResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    event_type: HistoryEventType
    event_time: datetime
    details: Optional[str] = None
    task_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
