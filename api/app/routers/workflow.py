from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.dependencies.auth import get_current_user, require_admin, require_officer
from app.models.ai_prediction import AIPrediction, AIProcessingStatus
from app.models.department import Department
from app.models.request_note import RequestNote
from app.models.request_status_history import RequestStatusHistory
from app.models.service_request import ServiceRequest, ServiceRequestStatus
from app.models.user import User, UserRole
from app.schemas.workflow import (
    AssignmentUpdate,
    NoteCreate,
    NoteResponse,
    OfficerCreate,
    OfficerRequestResponse,
    OfficerResponse,
    OfficerUpdate,
    StatusHistoryResponse,
    StatusUpdate,
)

router = APIRouter(tags=["Department Workflow"])
STATUS_TRANSITIONS = {
    ServiceRequestStatus.SUBMITTED: {ServiceRequestStatus.IN_PROGRESS},
    ServiceRequestStatus.PENDING: {ServiceRequestStatus.IN_PROGRESS},
    ServiceRequestStatus.IN_PROGRESS: {ServiceRequestStatus.RESOLVED},
    ServiceRequestStatus.RESOLVED: {ServiceRequestStatus.CLOSED},
}


def _officer_response(officer: User) -> OfficerResponse:
    return OfficerResponse(
        id=officer.id, name=officer.name, email=officer.email, phone=officer.phone,
        role=officer.role.value, department_id=officer.department_id,
        department_name=officer.department_name, is_active=officer.is_active,
    )


def _latest_ai(db: Session, request_id: int) -> AIPrediction | None:
    return db.scalar(select(AIPrediction).where(
        AIPrediction.service_request_id == request_id,
        AIPrediction.processing_status == AIProcessingStatus.COMPLETED,
    ).order_by(desc(AIPrediction.created_at), desc(AIPrediction.id)))


def _request_response(db: Session, service_request: ServiceRequest) -> OfficerRequestResponse:
    prediction = _latest_ai(db, service_request.id)
    return OfficerRequestResponse(
        id=service_request.id, user_id=service_request.user_id, title=service_request.title,
        description=service_request.description, location=service_request.location,
        latitude=service_request.latitude, longitude=service_request.longitude, image=service_request.image,
        status=service_request.status, department_id=service_request.department_id,
        department_name=service_request.department_name, assigned_officer_id=service_request.assigned_officer_id,
        assigned_officer_name=service_request.assigned_officer_name,
        category=prediction.category if prediction else None, priority=prediction.priority if prediction else None,
        ai_summary=prediction.summary if prediction else None,
        suggested_action=prediction.suggested_action if prediction else None,
        confidence=prediction.confidence if prediction else None,
        created_at=service_request.created_at, updated_at=service_request.updated_at,
    )


def _department_request(db: Session, request_id: int, current_user: User, assigned_only: bool = False) -> ServiceRequest:
    service_request = db.get(ServiceRequest, request_id)
    if service_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    if current_user.role == UserRole.ADMIN:
        return service_request
    if current_user.department_id is None or service_request.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    if assigned_only and service_request.assigned_officer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Request is assigned to another officer")
    return service_request


def _record_status(db: Session, service_request: ServiceRequest, old_status: ServiceRequestStatus, new_status: ServiceRequestStatus, user_id: int, note: str | None) -> None:
    db.add(RequestStatusHistory(
        service_request_id=service_request.id, old_status=old_status.value,
        new_status=new_status.value, changed_by=user_id, note=note,
    ))
    service_request.status = new_status


@router.get("/api/admin/officers", response_model=list[OfficerResponse])
def list_officers(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[OfficerResponse]:
    return [_officer_response(officer) for officer in db.scalars(select(User).where(User.role == UserRole.OFFICER).order_by(User.name)).all()]


@router.post("/api/admin/officers", response_model=OfficerResponse, status_code=status.HTTP_201_CREATED)
def create_officer(payload: OfficerCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> OfficerResponse:
    department = db.get(Department, payload.department_id)
    if department is None or not department.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active department is required")
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    officer = User(name=payload.name, email=payload.email, phone=payload.phone, password_hash=hash_password(payload.password), role=UserRole.OFFICER, department_id=department.id)
    db.add(officer); db.commit(); db.refresh(officer)
    return _officer_response(officer)


@router.patch("/api/admin/officers/{user_id}", response_model=OfficerResponse)
def update_officer(user_id: int, payload: OfficerUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> OfficerResponse:
    officer = db.get(User, user_id)
    if officer is None or officer.role != UserRole.OFFICER:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer not found")
    if payload.department_id is not None:
        department = db.get(Department, payload.department_id)
        if department is None or not department.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active department is required")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(officer, field, value)
    db.commit(); db.refresh(officer)
    return _officer_response(officer)


@router.get("/api/officer/requests", response_model=list[OfficerRequestResponse])
def officer_requests(
    status_filter: ServiceRequestStatus | None = Query(default=None, alias="status"),
    priority: str | None = None, search: str | None = None, assigned: bool | None = None,
    officer: User = Depends(require_officer), db: Session = Depends(get_db),
) -> list[OfficerRequestResponse]:
    if officer.department_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Officer has no department")
    query = select(ServiceRequest).where(ServiceRequest.department_id == officer.department_id)
    if status_filter is not None: query = query.where(ServiceRequest.status == status_filter)
    if assigned is True: query = query.where(ServiceRequest.assigned_officer_id == officer.id)
    if assigned is False: query = query.where(ServiceRequest.assigned_officer_id.is_(None))
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(or_(ServiceRequest.title.ilike(pattern), ServiceRequest.description.ilike(pattern), ServiceRequest.location.ilike(pattern)))
    requests = list(db.scalars(query.order_by(desc(ServiceRequest.created_at))).all())
    results = [_request_response(db, item) for item in requests]
    if priority: results = [item for item in results if item.priority == priority]
    return results


@router.get("/api/officer/requests/{request_id}", response_model=OfficerRequestResponse)
def officer_request_detail(request_id: int, officer: User = Depends(require_officer), db: Session = Depends(get_db)) -> OfficerRequestResponse:
    return _request_response(db, _department_request(db, request_id, officer))


@router.post("/api/officer/requests/{request_id}/claim", response_model=OfficerRequestResponse)
def claim_request(request_id: int, officer: User = Depends(require_officer), db: Session = Depends(get_db)) -> OfficerRequestResponse:
    if officer.department_id is None or not officer.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active officer department is required")
    service_request = _department_request(db, request_id, officer)
    if service_request.assigned_officer_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Request is already assigned")
    if service_request.status in {ServiceRequestStatus.SUBMITTED, ServiceRequestStatus.PENDING}:
        _record_status(db, service_request, service_request.status, ServiceRequestStatus.IN_PROGRESS, officer.id, "Request claimed by officer")
    service_request.assigned_officer_id = officer.id
    db.commit(); db.refresh(service_request)
    return _request_response(db, service_request)


@router.post("/api/officer/requests/{request_id}/unclaim", response_model=OfficerRequestResponse)
def unclaim_request(request_id: int, officer: User = Depends(require_officer), db: Session = Depends(get_db)) -> OfficerRequestResponse:
    service_request = _department_request(db, request_id, officer)
    if service_request.assigned_officer_id != officer.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the assigned officer can unclaim this request")
    service_request.assigned_officer_id = None
    db.commit(); db.refresh(service_request)
    return _request_response(db, service_request)


@router.patch("/api/officer/requests/{request_id}/status", response_model=OfficerRequestResponse)
def update_request_status(request_id: int, payload: StatusUpdate, officer: User = Depends(require_officer), db: Session = Depends(get_db)) -> OfficerRequestResponse:
    service_request = _department_request(db, request_id, officer, assigned_only=True)
    allowed = STATUS_TRANSITIONS.get(service_request.status, set())
    if payload.status not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status transition")
    _record_status(db, service_request, service_request.status, payload.status, officer.id, payload.note)
    db.commit(); db.refresh(service_request)
    return _request_response(db, service_request)


@router.post("/api/officer/requests/{request_id}/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def add_note(request_id: int, payload: NoteCreate, officer: User = Depends(require_officer), db: Session = Depends(get_db)) -> RequestNote:
    service_request = _department_request(db, request_id, officer, assigned_only=True)
    note = RequestNote(service_request_id=service_request.id, officer_id=officer.id, note=payload.note)
    db.add(note); db.commit(); db.refresh(note)
    return note


@router.get("/api/officer/requests/{request_id}/notes", response_model=list[NoteResponse])
def list_notes(request_id: int, officer: User = Depends(require_officer), db: Session = Depends(get_db)) -> list[RequestNote]:
    service_request = _department_request(db, request_id, officer)
    return list(db.scalars(select(RequestNote).where(RequestNote.service_request_id == service_request.id).order_by(RequestNote.created_at)).all())


@router.get("/api/officer/requests/{request_id}/history", response_model=list[StatusHistoryResponse])
def list_history(request_id: int, officer: User = Depends(require_officer), db: Session = Depends(get_db)) -> list[RequestStatusHistory]:
    service_request = _department_request(db, request_id, officer)
    return list(db.scalars(select(RequestStatusHistory).where(RequestStatusHistory.service_request_id == service_request.id).order_by(RequestStatusHistory.created_at)).all())


@router.get("/api/admin/requests", response_model=list[OfficerRequestResponse])
def admin_requests(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[OfficerRequestResponse]:
    return [_request_response(db, item) for item in db.scalars(select(ServiceRequest).order_by(desc(ServiceRequest.created_at))).all()]


@router.patch("/api/admin/requests/{request_id}/assignment", response_model=OfficerRequestResponse)
def admin_assignment(request_id: int, payload: AssignmentUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> OfficerRequestResponse:
    service_request = db.get(ServiceRequest, request_id)
    if service_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    if payload.department_id is not None:
        department = db.get(Department, payload.department_id)
        if department is None or not department.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Active department is required")
        service_request.department_id = department.id
    if payload.assigned_officer_id is not None:
        officer = db.get(User, payload.assigned_officer_id)
        if officer is None or officer.role != UserRole.OFFICER or not officer.is_active or officer.department_id != service_request.department_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Officer must be active and belong to the request department")
        service_request.assigned_officer_id = officer.id
    else:
        service_request.assigned_officer_id = None
    db.commit(); db.refresh(service_request)
    return _request_response(db, service_request)


@router.patch("/api/admin/requests/{request_id}/status", response_model=OfficerRequestResponse)
def admin_status(request_id: int, payload: StatusUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> OfficerRequestResponse:
    service_request = db.get(ServiceRequest, request_id)
    if service_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    if payload.status == service_request.status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already has this status")
    _record_status(db, service_request, service_request.status, payload.status, admin.id, payload.note)
    db.commit(); db.refresh(service_request)
    return _request_response(db, service_request)


@router.get("/api/admin/requests/{request_id}/notes", response_model=list[NoteResponse])
def admin_notes(request_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[RequestNote]:
    if db.get(ServiceRequest, request_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    return list(db.scalars(select(RequestNote).where(RequestNote.service_request_id == request_id).order_by(RequestNote.created_at)).all())


@router.get("/api/admin/requests/{request_id}/history", response_model=list[StatusHistoryResponse])
def admin_history(request_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[RequestStatusHistory]:
    if db.get(ServiceRequest, request_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    return list(db.scalars(select(RequestStatusHistory).where(RequestStatusHistory.service_request_id == request_id).order_by(RequestStatusHistory.created_at)).all())