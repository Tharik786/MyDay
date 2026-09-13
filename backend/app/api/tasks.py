from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import TaskStatus
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, TaskSummaryResponse,
    SnoozeRequest, RescheduleRequest, NotificationIdUpdate
)
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/summary", response_model=TaskSummaryResponse)
async def get_task_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    summary = await TaskService.get_task_summary(db, current_user.id)
    return TaskSummaryResponse(**summary)


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    status: Optional[TaskStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    date_filter: Optional[date] = Query(None, description="Filter by task start date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tasks = await TaskService.list_tasks(
        db=db,
        user_id=current_user.id,
        status_filter=status,
        search=search,
        date_filter=date_filter
    )
    return [TaskResponse.model_validate(t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await TaskService.create_task(db, current_user.id, task_in)
    return TaskResponse.model_validate(task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await TaskService.get_task_by_id(db, task_id, current_user.id)
    return TaskResponse.model_validate(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await TaskService.update_task(db, task_id, current_user.id, task_in)
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await TaskService.delete_task(db, task_id, current_user.id)
    return None


@router.post("/{task_id}/pause", response_model=TaskResponse)
async def pause_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await TaskService.pause_task(db, task_id, current_user.id)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/resume", response_model=TaskResponse)
async def resume_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await TaskService.resume_task(db, task_id, current_user.id)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/snooze", response_model=TaskResponse)
async def snooze_task(
    task_id: int,
    snooze_in: SnoozeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await TaskService.snooze_task(db, task_id, current_user.id, snooze_in)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/reschedule", response_model=TaskResponse)
async def reschedule_task(
    task_id: int,
    reschedule_in: RescheduleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await TaskService.reschedule_task(db, task_id, current_user.id, reschedule_in)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await TaskService.complete_task(db, task_id, current_user.id)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}/notification", response_model=TaskResponse)
async def update_notification_id(
    task_id: int,
    payload: NotificationIdUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await TaskService.get_task_by_id(db, task_id, current_user.id)
    task.notification_id = payload.notification_id
    await db.commit()
    await db.refresh(task)
    return TaskResponse.model_validate(task)
