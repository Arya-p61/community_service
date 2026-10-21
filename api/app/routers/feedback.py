from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.department import Department
from app.models.feedback import Feedback
from app.models.service_request import ServiceRequest, ServiceRequestStatus
from app.models.user import User, UserRole
from app.schemas.feedback import (
    AdminFeedbackOverview,
    DepartmentRatingSummary,
    FeedbackCreate,
    FeedbackResponse,
    FeedbackUpdate,
)

router = APIRouter(tags=["Feedback & Rating"])



def _to_response(feedback: Feedback, service_request: ServiceRequest | None = None, citizen: User | None = None) -> FeedbackResponse:
    req = service_request or feedback.service_request
    cit = citizen or feedback.citizen
    return FeedbackResponse(
        id=feedback.id,
        service_request_id=feedback.service_request_id,
        citizen_id=feedback.citizen_id,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
        service_request_title=req.title if req else None,
        department_name=req.department_name if req else None,
        citizen_name=cit.name if cit else None,
    )


@router.post(
    "/api/service-requests/{request_id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_feedback(
    request_id: int,
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    service_request = db.get(ServiceRequest, request_id)
    if service_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")

    if service_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit feedback for your own service requests",
        )

    if service_request.status not in {ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CLOSED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback can only be submitted once the request is resolved or closed",
        )

    existing = db.scalar(select(Feedback).where(Feedback.service_request_id == request_id))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Feedback has already been submitted for this service request",
        )

    feedback = Feedback(
        service_request_id=request_id,
        citizen_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment.strip() if payload.comment else None,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return _to_response(feedback, service_request, current_user)


@router.get(
    "/api/service-requests/{request_id}/feedback",
    response_model=FeedbackResponse,
)
def get_request_feedback(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    service_request = db.get(ServiceRequest, request_id)
    if service_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")

    # Access control
    if current_user.role == UserRole.CITIZEN:
        if service_request.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == UserRole.OFFICER:
        if current_user.department_id is None or service_request.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Request belongs to another department",
            )

    feedback = db.scalar(select(Feedback).where(Feedback.service_request_id == request_id))
    if feedback is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No feedback recorded for this request",
        )

    return _to_response(feedback, service_request)


@router.patch(
    "/api/service-requests/{request_id}/feedback",
    response_model=FeedbackResponse,
)
def update_feedback(
    request_id: int,
    payload: FeedbackUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    service_request = db.get(ServiceRequest, request_id)
    if service_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")

    if service_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit feedback for your own service requests",
        )

    feedback = db.scalar(select(Feedback).where(Feedback.service_request_id == request_id))
    if feedback is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found",
        )

    if payload.rating is not None:
        feedback.rating = payload.rating
    if payload.comment is not None:
        feedback.comment = payload.comment.strip() if payload.comment.strip() else None

    db.commit()
    db.refresh(feedback)
    return _to_response(feedback, service_request, current_user)


@router.get(
    "/api/feedback/my",
    response_model=list[FeedbackResponse],
)
def get_my_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FeedbackResponse]:
    feedbacks = list(
        db.scalars(
            select(Feedback)
            .where(Feedback.citizen_id == current_user.id)
            .order_by(desc(Feedback.created_at))
        ).all()
    )
    return [_to_response(f) for f in feedbacks]


@router.get(
    "/api/admin/feedback",
    response_model=AdminFeedbackOverview,
)
def get_admin_feedback(
    rating: int | None = Query(default=None, ge=1, le=5),
    department_id: int | None = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminFeedbackOverview:
    all_feedbacks = list(db.scalars(select(Feedback).order_by(desc(Feedback.created_at))).all())
    departments = list(db.scalars(select(Department).order_by(Department.name)).all())

    total_count = len(all_feedbacks)
    avg_rating = round(sum(f.rating for f in all_feedbacks) / total_count, 2) if total_count > 0 else 0.0

    distribution = {i: 0 for i in range(1, 6)}
    for f in all_feedbacks:
        if 1 <= f.rating <= 5:
            distribution[f.rating] += 1

    # Department breakdown
    dept_map = {d.id: d.name for d in departments}
    dept_feedbacks: dict[int | None, list[Feedback]] = {}
    for f in all_feedbacks:
        d_id = f.service_request.department_id if f.service_request else None
        dept_feedbacks.setdefault(d_id, []).append(f)

    department_breakdown: list[DepartmentRatingSummary] = []
    for d_id, f_list in dept_feedbacks.items():
        name = dept_map.get(d_id, "General / Unrouted")
        d_avg = round(sum(item.rating for item in f_list) / len(f_list), 2) if f_list else 0.0
        department_breakdown.append(
            DepartmentRatingSummary(
                department_id=d_id,
                department_name=name,
                count=len(f_list),
                average_rating=d_avg,
            )
        )
    department_breakdown.sort(key=lambda x: x.count, reverse=True)

    # Filtered list of items
    filtered = all_feedbacks
    if rating is not None:
        filtered = [f for f in filtered if f.rating == rating]
    if department_id is not None:
        filtered = [f for f in filtered if f.service_request and f.service_request.department_id == department_id]

    items = [_to_response(f) for f in filtered]

    return AdminFeedbackOverview(
        total_feedback=total_count,
        average_rating=avg_rating,
        rating_distribution=distribution,
        department_breakdown=department_breakdown,
        items=items,
    )
