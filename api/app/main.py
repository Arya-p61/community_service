from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import Base, engine
from app.models import AIPrediction, ServiceRequest, User  # noqa: F401
from app.routers.ai_predictions import router as ai_predictions_router
from app.routers.auth import router as auth_router
from app.routers.service_requests import MEDIA_DIR, router as service_requests_router

MEDIA_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
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
app.mount("/media", StaticFiles(directory=MEDIA_DIR.parent), name="media")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}