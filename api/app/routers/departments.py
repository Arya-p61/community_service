from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.department import Department
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate

router = APIRouter(prefix="/api/departments", tags=["Departments"])


@router.get("", response_model=list[DepartmentResponse])
def list_departments(
    include_inactive: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Department]:
    show_inactive = include_inactive and current_user.role.value == "admin"
    query = select(Department).order_by(Department.name)
    if not show_inactive:
        query = query.where(Department.is_active.is_(True))
    return list(db.scalars(query).all())


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Department:
    department = Department(name=payload.name, code=payload.code.upper(), description=payload.description)
    db.add(department)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department name or code already exists") from None
    db.refresh(department)
    return department


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Department:
    department = db.get(Department, department_id)
    if department is None or (not department.is_active and current_user.role.value != "admin"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return department


@router.patch("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Department:
    department = db.get(Department, department_id)
    if department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(department, field, value.upper() if field == "code" and value else value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department name or code already exists") from None
    db.refresh(department)
    return department


@router.delete("/{department_id}", response_model=DepartmentResponse)
def deactivate_department(
    department_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Department:
    department = db.get(Department, department_id)
    if department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    department.is_active = False
    db.commit()
    db.refresh(department)
    return department