from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.ai_prediction import AIPrediction, AIProcessingStatus
from app.models.service_request import ServiceRequest
from app.models.department import Department
from app.services.ai_service import (
    DEPARTMENT_BY_CATEGORY,
    FALLBACK_ACTION,
    AIServiceError,
    classify_request,
    validate_classification,
)


def pending_prediction(service_request_id: int) -> AIPrediction:
    return AIPrediction(
        service_request_id=service_request_id,
        category="Other",
        priority="Medium",
        summary="AI analysis is in progress.",
        suggested_action=FALLBACK_ACTION,
        confidence=0.0,
        department=DEPARTMENT_BY_CATEGORY["Other"],
        model="gemini",
        processing_status=AIProcessingStatus.PENDING,
    )


async def classify_and_store(db: Session, service_request: ServiceRequest) -> AIPrediction:
    try:
        classification = await classify_request(
            service_request.title,
            service_request.description,
            service_request.location,
        )
        processing_status = AIProcessingStatus.COMPLETED
    except AIServiceError:
        classification = validate_classification({}, service_request.description)
        processing_status = AIProcessingStatus.FAILED

    prediction = AIPrediction(
        service_request_id=service_request.id,
        category=classification.category,
        priority=classification.priority,
        summary=classification.summary,
        suggested_action=classification.suggested_action,
        confidence=classification.confidence,
        department=DEPARTMENT_BY_CATEGORY[classification.category],
        model="gemini",
        processing_status=processing_status,
    )
    if processing_status == AIProcessingStatus.COMPLETED:
        department_name = DEPARTMENT_BY_CATEGORY[classification.category]
        department = db.scalar(select(Department).where(Department.name == department_name))
        if department is not None and department.is_active:
            service_request.department_id = department.id
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


async def classify_in_background(service_request_id: int) -> None:
    db = SessionLocal()
    try:
        service_request = db.get(ServiceRequest, service_request_id)
        if service_request is not None:
            await classify_and_store(db, service_request)
    finally:
        db.close()