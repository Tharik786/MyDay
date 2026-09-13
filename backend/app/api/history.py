from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import Task
from app.models.history import TaskHistory, HistoryEventType
from app.schemas.history import TaskHistoryResponse

router = APIRouter(prefix="/history", tags=["Task History"])


@router.get("", response_model=List[TaskHistoryResponse])
async def get_history(
    task_id: Optional[int] = Query(None, description="Filter history by task ID"),
    event_type: Optional[HistoryEventType] = Query(None, description="Filter by event type"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(TaskHistory, Task.title)
        .outerjoin(Task, TaskHistory.task_id == Task.id)
        .where(TaskHistory.user_id == current_user.id)
    )

    if task_id:
        query = query.where(TaskHistory.task_id == task_id)
    if event_type:
        query = query.where(TaskHistory.event_type == event_type)

    query = query.order_by(TaskHistory.event_time.desc()).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for hist, title in rows:
        hist_dict = {
            "id": hist.id,
            "task_id": hist.task_id,
            "user_id": hist.user_id,
            "event_type": hist.event_type,
            "event_time": hist.event_time,
            "details": hist.details,
            "task_title": title or "Deleted Task"
        }
        items.append(TaskHistoryResponse(**hist_dict))

    return items
