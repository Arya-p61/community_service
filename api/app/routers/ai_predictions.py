from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.ai_prediction import AIPrediction
from app.models.service_request import ServiceRequest
from app.models.user import User, UserRole
from app.schemas.ai_prediction import AIPredictionResponse
from app.services.ai_prediction_service import classify_and_store

router = APIRouter(prefix="/api/service-requests", tags=["AI Classification"])


def _authorized_request(db: Session, request_id: int, current_user: User) -> ServiceRequest:
    service_request = db.get(ServiceRequest, request_id)
    if service_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    is_privileged = current_user.role in {UserRole.OFFICER, UserRole.ADMIN}
    if service_request.user_id != current_user.id and not is_privileged:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    return service_request


def _latest_prediction(db: Session, request_id: int) -> AIPrediction:
    prediction = db.scalar(
        select(AIPrediction)
        .where(AIPrediction.service_request_id == request_id)
        .order_by(desc(AIPrediction.created_at), desc(AIPrediction.id))
    )
    if prediction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI classification not found")
    return prediction


@router.post("/{request_id}/classify", response_model=AIPredictionResponse)
async def classify_service_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIPrediction:
    service_request = _authorized_request(db, request_id, current_user)
    return await classify_and_store(db, service_request)


@router.get("/{request_id}/classification", response_model=AIPredictionResponse)
def get_classification(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIPrediction:
    _authorized_request(db, request_id, current_user)
    return _latest_prediction(db, request_id)