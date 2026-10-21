from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.service_request import ServiceRequest, ServiceRequestStatus
from app.models.request_status_history import RequestStatusHistory
from app.models.user import User, UserRole
from app.services.ai_prediction_service import classify_in_background, pending_prediction
from app.schemas.service_request import (
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceRequestUpdate,
)
from app.schemas.workflow import StatusHistoryResponse

router = APIRouter(prefix="/api/service-requests", tags=["Service Requests"])
MEDIA_DIR = Path(__file__).resolve().parents[2] / "media" / "requests"
MAX_IMAGE_SIZE = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}
EDITABLE_STATUSES = {
    ServiceRequestStatus.SUBMITTED,
    ServiceRequestStatus.PENDING,
}


def _owned_request(db: Session, request_id: int, user_id: int) -> ServiceRequest:
    service_request = db.scalar(
        select(ServiceRequest).where(
            ServiceRequest.id == request_id,
            ServiceRequest.user_id == user_id,
        )
    )
    if service_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    return service_request


async def _parse_payload(request: Request, schema: type[ServiceRequestCreate | ServiceRequestUpdate]):
    try:
        content_type = request.headers.get("content-type", "")
        if content_type.startswith("multipart/form-data"):
            form = await request.form()
            values = dict(form)
            image = values.pop("image", None)
            values = {key: (None if value == "" else value) for key, value in values.items()}
            return schema.model_validate(values), image if isinstance(image, UploadFile) else None

        return schema.model_validate(await request.json()), None
    except ValidationError as exc:
        raise RequestValidationError(exc.errors())


async def _save_image(image: UploadFile | None) -> str | None:
    if image is None or not image.filename:
        return None
    extension = Path(image.filename).suffix.lower()
    if extension not in ALLOWED_IMAGE_TYPES or image.content_type != ALLOWED_IMAGE_TYPES[extension]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, JPEG, PNG, and WEBP images are supported",
        )
    contents = await image.read(MAX_IMAGE_SIZE + 1)
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Images must be 5 MB or smaller",
        )

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{extension}"
    (MEDIA_DIR / filename).write_bytes(contents)
    return f"/media/requests/{filename}"


def _remove_image(image_path: str | None) -> None:
    if image_path:
        filename = Path(image_path).name
        stored_file = MEDIA_DIR / filename
        if stored_file.is_file():
            stored_file.unlink()


@router.post("", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_service_request(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ServiceRequest:
    payload, image = await _parse_payload(request, ServiceRequestCreate)
    service_request = ServiceRequest(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        location=payload.location,
        latitude=payload.latitude,
        longitude=payload.longitude,
        image=await _save_image(image),
        status=ServiceRequestStatus.SUBMITTED,
    )
    db.add(service_request)
    db.commit()
    db.refresh(service_request)
    db.add(RequestStatusHistory(
        service_request_id=service_request.id,
        old_status="NONE",
        new_status=ServiceRequestStatus.SUBMITTED.value,
        changed_by=current_user.id,
        note="Request submitted by citizen",
    ))
    db.add(pending_prediction(service_request.id))
    db.commit()
    background_tasks.add_task(classify_in_background, service_request.id)
    return service_request


@router.get("", response_model=list[ServiceRequestResponse])
def list_service_requests(
    search: str | None = None,
    request_status: ServiceRequestStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ServiceRequest]:
    query = select(ServiceRequest).where(ServiceRequest.user_id == current_user.id)
    if request_status is not None:
        query = query.where(ServiceRequest.status == request_status)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                ServiceRequest.title.ilike(search_pattern),
                ServiceRequest.description.ilike(search_pattern),
                ServiceRequest.location.ilike(search_pattern),
            )
        )
    return list(db.scalars(query.order_by(desc(ServiceRequest.created_at))).all())


@router.get("/{request_id}", response_model=ServiceRequestResponse)
def get_service_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ServiceRequest:
    return _owned_request(db, request_id, current_user.id)


@router.get("/{request_id}/history", response_model=list[StatusHistoryResponse])
@router.get("/{request_id}/status-history", response_model=list[StatusHistoryResponse])
def get_request_history(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RequestStatusHistory]:
    service_request = db.get(ServiceRequest, request_id)
    if service_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    if current_user.role == UserRole.CITIZEN and service_request.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service request not found")
    if current_user.role == UserRole.OFFICER and service_request.department_id != current_user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Request belongs to another department")
    history = db.scalars(select(RequestStatusHistory).where(RequestStatusHistory.service_request_id == service_request.id).order_by(RequestStatusHistory.created_at)).all()
    return [
        StatusHistoryResponse(
            id=item.id,
            service_request_id=item.service_request_id,
            old_status=None if item.old_status == "NONE" else item.old_status,
            new_status=item.new_status,
            changed_by=item.changed_by,
            note=item.note,
            created_at=item.created_at,
        )
        for item in history
    ]


@router.patch("/{request_id}", response_model=ServiceRequestResponse)
async def update_service_request(
    request_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ServiceRequest:
    service_request = _owned_request(db, request_id, current_user.id)
    if service_request.status not in EDITABLE_STATUSES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This request is no longer editable")

    payload, image = await _parse_payload(request, ServiceRequestUpdate)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service_request, field, value)
    if image is not None:
        _remove_image(service_request.image)
        service_request.image = await _save_image(image)
    db.commit()
    db.refresh(service_request)
    return service_request


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    service_request = _owned_request(db, request_id, current_user.id)
    if service_request.status not in EDITABLE_STATUSES:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This request can no longer be cancelled")
    _remove_image(service_request.image)
    db.delete(service_request)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)