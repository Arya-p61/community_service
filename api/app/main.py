from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import Base, engine
from app.core.schema import ensure_workflow_columns, seed_default_departments
from app.models import AIPrediction, Feedback, ServiceRequest, User  # noqa: F401
from app.routers.ai_predictions import router as ai_predictions_router
from app.routers.auth import router as auth_router
from app.routers.departments import router as departments_router
from app.routers.feedback import router as feedback_router
from app.routers.service_requests import MEDIA_DIR, router as service_requests_router
from app.routers.workflow import router as workflow_router

MEDIA_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_workflow_columns(engine)
    seed_default_departments()
    yield


app = FastAPI(title="Community Service Request System API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(service_requests_router)
app.include_router(ai_predictions_router)
app.include_router(departments_router)
app.include_router(workflow_router)
app.include_router(feedback_router)
app.mount("/media", StaticFiles(directory=MEDIA_DIR.parent), name="media")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}