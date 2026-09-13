from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.tasks import router as tasks_router
from app.api.history import router as history_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(tasks_router)
api_router.include_router(history_router)
