import csv
import io
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models.ai_prediction import AIPrediction, AIProcessingStatus
from app.models.department import Department
from app.models.feedback import Feedback
from app.models.request_status_history import RequestStatusHistory
from app.models.service_request import ServiceRequest, ServiceRequestStatus
from app.models.user import User, UserRole
from app.schemas.analytics import (
    DepartmentFeedbackSummary,
    DepartmentPerformanceItem,
    DistributionItem,
    DistributionsResponse,
    FeedbackAnalyticsResponse,
    OfficerWorkloadItem,
    OverviewAnalytics,
    RecentFeedbackItem,
    RequestActivityResponse,
    StaleRequestItem,
    StatusTransitionCount,
    TimeBucket,
)

router = APIRouter(prefix="/api/admin/analytics", tags=["Admin Analytics"])


def _parse_dates(start_date: str | None, end_date: str | None) -> tuple[datetime | None, datetime | None]:
    start_dt = None
    end_dt = None

    if start_date:
        try:
            d = date.fromisoformat(start_date)
            start_dt = datetime.combine(d, time.min)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Expected YYYY-MM-DD",
            )

    if end_date:
        try:
            d = date.fromisoformat(end_date)
            end_dt = datetime.combine(d, time.max)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Expected YYYY-MM-DD",
            )

    if start_dt and end_dt and start_dt > end_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date cannot be later than end_date",
        )

    return start_dt, end_dt


def _apply_request_filters(
    query,
    start_dt: datetime | None = None,
    end_dt: datetime | None = None,
    department_id: int | None = None,
    status_filter: ServiceRequestStatus | None = None,
    priority: str | None = None,
    category: str | None = None,
    officer_id: int | None = None,
):
    if start_dt:
        query = query.where(ServiceRequest.created_at >= start_dt)
    if end_dt:
        query = query.where(ServiceRequest.created_at <= end_dt)
    if department_id is not None:
        query = query.where(ServiceRequest.department_id == department_id)
    if status_filter is not None:
        query = query.where(ServiceRequest.status == status_filter)
    if officer_id is not None:
        query = query.where(ServiceRequest.assigned_officer_id == officer_id)

    # Filter by AI prediction priority or category
    if priority or category:
        ai_subquery = (
            select(AIPrediction.service_request_id)
            .where(AIPrediction.processing_status == AIProcessingStatus.COMPLETED)
        )
        if priority:
            ai_subquery = ai_subquery.where(AIPrediction.priority.ilike(priority.strip()))
        if category:
            ai_subquery = ai_subquery.where(AIPrediction.category.ilike(category.strip()))
        query = query.where(ServiceRequest.id.in_(ai_subquery))

    return query


def _compute_avg_resolution_hours(db: Session, request_ids: list[int]) -> float | None:
    if not request_ids:
        return None

    # Find earliest resolution history timestamp for each request
    histories = db.execute(
        select(
            RequestStatusHistory.service_request_id,
            func.min(RequestStatusHistory.created_at).label("resolved_at"),
        )
        .where(
            RequestStatusHistory.service_request_id.in_(request_ids),
            RequestStatusHistory.new_status.in_(["RESOLVED", "CLOSED"]),
        )
        .group_by(RequestStatusHistory.service_request_id)
    ).all()

    resolution_map = {row.service_request_id: row.resolved_at for row in histories}
    if not resolution_map:
        return None

    # Fetch created_at for these requests
    reqs = db.execute(
        select(ServiceRequest.id, ServiceRequest.created_at, ServiceRequest.updated_at)
        .where(ServiceRequest.id.in_(list(resolution_map.keys())))
    ).all()

    durations = []
    for r in reqs:
        res_time = resolution_map.get(r.id) or r.updated_at
        if res_time and r.created_at and res_time >= r.created_at:
            hours = (res_time - r.created_at).total_seconds() / 3600.0
            durations.append(hours)

    return round(sum(durations) / len(durations), 1) if durations else None


@router.get("/overview", response_model=OverviewAnalytics)
def get_analytics_overview(
    start_date: str | None = None,
    end_date: str | None = None,
    department_id: int | None = None,
    status_filter: ServiceRequestStatus | None = Query(default=None, alias="status"),
    priority: str | None = None,
    category: str | None = None,
    officer_id: int | None = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> OverviewAnalytics:
    start_dt, end_dt = _parse_dates(start_date, end_date)

    base_query = _apply_request_filters(
        select(ServiceRequest),
        start_dt=start_dt,
        end_dt=end_dt,
        department_id=department_id,
        status_filter=status_filter,
        priority=priority,
        category=category,
        officer_id=officer_id,
    )

    requests = list(db.scalars(base_query).all())
    total_requests = len(requests)

    submitted_count = sum(1 for r in requests if r.status == ServiceRequestStatus.SUBMITTED)
    pending_count = sum(1 for r in requests if r.status == ServiceRequestStatus.PENDING)
    in_progress_count = sum(1 for r in requests if r.status == ServiceRequestStatus.IN_PROGRESS)
    resolved_count = sum(1 for r in requests if r.status == ServiceRequestStatus.RESOLVED)
    closed_count = sum(1 for r in requests if r.status == ServiceRequestStatus.CLOSED)
    unassigned_count = sum(1 for r in requests if r.assigned_officer_id is None)
    unrouted_count = sum(1 for r in requests if r.department_id is None)

    resolved_ids = [r.id for r in requests if r.status in {ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CLOSED}]
    avg_resolution_hours = _compute_avg_resolution_hours(db, resolved_ids)

    # Feedback calculations
    all_req_ids = [r.id for r in requests]
    feedback_ratings = []
    if all_req_ids:
        feedbacks = db.scalars(
            select(Feedback.rating).where(Feedback.service_request_id.in_(all_req_ids))
        ).all()
        feedback_ratings = [fb for fb in feedbacks if fb is not None]

    avg_satisfaction = (
        round(sum(feedback_ratings) / len(feedback_ratings), 2)
        if feedback_ratings
        else None
    )

    resolution_rate = (
        round(((resolved_count + closed_count) / total_requests) * 100.0, 1)
        if total_requests > 0
        else 0.0
    )

    return OverviewAnalytics(
        total_requests=total_requests,
        submitted_requests=submitted_count,
        pending_requests=pending_count,
        in_progress_requests=in_progress_count,
        resolved_requests=resolved_count,
        closed_requests=closed_count,
        unassigned_requests=unassigned_count,
        unrouted_requests=unrouted_count,
        avg_resolution_time_hours=avg_resolution_hours,
        avg_satisfaction_rating=avg_satisfaction,
        total_feedback_count=len(feedback_ratings),
        resolution_rate_percent=resolution_rate,
    )


@router.get("/requests-over-time", response_model=list[TimeBucket])
def get_requests_over_time(
    group_by: str = Query(default="day", pattern="^(day|week|month)$"),
    start_date: str | None = None,
    end_date: str | None = None,
    department_id: int | None = None,
    status_filter: ServiceRequestStatus | None = Query(default=None, alias="status"),
    priority: str | None = None,
    category: str | None = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[TimeBucket]:
    start_dt, end_dt = _parse_dates(start_date, end_date)

    # Default to last 30 days if no range provided
    if not start_dt and not end_dt:
        start_dt = datetime.now() - timedelta(days=30)

    # Received requests
    req_query = _apply_request_filters(
        select(ServiceRequest.id, ServiceRequest.created_at),
        start_dt=start_dt,
        end_dt=end_dt,
        department_id=department_id,
        status_filter=status_filter,
        priority=priority,
        category=category,
    )
    reqs = db.execute(req_query).all()

    # Resolved events from status history
    res_query = (
        select(RequestStatusHistory.created_at)
        .join(ServiceRequest, ServiceRequest.id == RequestStatusHistory.service_request_id)
        .where(RequestStatusHistory.new_status.in_(["RESOLVED", "CLOSED"]))
    )
    if start_dt:
        res_query = res_query.where(RequestStatusHistory.created_at >= start_dt)
    if end_dt:
        res_query = res_query.where(RequestStatusHistory.created_at <= end_dt)
    if department_id is not None:
        res_query = res_query.where(ServiceRequest.department_id == department_id)

    res_events = db.scalars(res_query).all()

    def get_bucket_key(dt: datetime) -> str:
        if group_by == "month":
            return dt.strftime("%Y-%m")
        elif group_by == "week":
            # Monday of the week
            mon = dt.date() - timedelta(days=dt.weekday())
            return mon.strftime("%Y-%m-%d")
        return dt.strftime("%Y-%m-%d")

    buckets: dict[str, dict[str, int]] = {}

    for row in reqs:
        if row.created_at:
            key = get_bucket_key(row.created_at)
            if key not in buckets:
                buckets[key] = {"received": 0, "resolved": 0}
            buckets[key]["received"] += 1

    for dt in res_events:
        if dt:
            key = get_bucket_key(dt)
            if key not in buckets:
                buckets[key] = {"received": 0, "resolved": 0}
            buckets[key]["resolved"] += 1

    sorted_keys = sorted(buckets.keys())
    return [
        TimeBucket(date=k, received=buckets[k]["received"], resolved=buckets[k]["resolved"])
        for k in sorted_keys
    ]


@router.get("/distribution", response_model=DistributionsResponse)
def get_distribution_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    department_id: int | None = None,
    status_filter: ServiceRequestStatus | None = Query(default=None, alias="status"),
    priority: str | None = None,
    category: str | None = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DistributionsResponse:
    start_dt, end_dt = _parse_dates(start_date, end_date)

    query = _apply_request_filters(
        select(ServiceRequest),
        start_dt=start_dt,
        end_dt=end_dt,
        department_id=department_id,
        status_filter=status_filter,
        priority=priority,
        category=category,
    )
    requests = list(db.scalars(query).all())
    req_ids = [r.id for r in requests]

    # By Status
    status_counts = {
        "SUBMITTED": 0,
        "PENDING": 0,
        "IN_PROGRESS": 0,
        "RESOLVED": 0,
        "CLOSED": 0,
    }
    for r in requests:
        val = r.status.value if hasattr(r.status, "value") else str(r.status)
        if val in status_counts:
            status_counts[val] += 1

    by_status = [
        DistributionItem(label="Submitted", value=status_counts["SUBMITTED"], color="#3182CE", key="SUBMITTED"),
        DistributionItem(label="Pending Review", value=status_counts["PENDING"], color="#DD6B20", key="PENDING"),
        DistributionItem(label="In Progress", value=status_counts["IN_PROGRESS"], color="#2D6A52", key="IN_PROGRESS"),
        DistributionItem(label="Resolved", value=status_counts["RESOLVED"], color="#38A169", key="RESOLVED"),
        DistributionItem(label="Closed", value=status_counts["CLOSED"], color="#718096", key="CLOSED"),
    ]

    # By Priority & Category (from AIPrediction)
    priority_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "Unclassified": 0}
    category_counts: dict[str, int] = {}

    if req_ids:
        predictions = db.scalars(
            select(AIPrediction)
            .where(
                AIPrediction.service_request_id.in_(req_ids),
                AIPrediction.processing_status == AIProcessingStatus.COMPLETED,
            )
            .order_by(desc(AIPrediction.created_at))
        ).all()

        # Keep latest prediction per request
        latest_pred = {}
        for p in predictions:
            if p.service_request_id not in latest_pred:
                latest_pred[p.service_request_id] = p

        for r in requests:
            pred = latest_pred.get(r.id)
            p_label = pred.priority if pred and pred.priority in priority_counts else "Unclassified"
            priority_counts[p_label] += 1

            cat_label = pred.category if pred and pred.category else "General Inquiry"
            category_counts[cat_label] = category_counts.get(cat_label, 0) + 1

    priority_colors = {
        "Critical": "#C2413B",
        "High": "#C05621",
        "Medium": "#975A16",
        "Low": "#276749",
        "Unclassified": "#8E9C96",
    }
    by_priority = [
        DistributionItem(label=k, value=v, color=priority_colors.get(k, "#2D6A52"), key=k)
        for k, v in priority_counts.items()
        if v > 0 or k != "Unclassified"
    ]

    by_category = [
        DistributionItem(label=k, value=v, key=k)
        for k, v in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # By Department
    dept_counts: dict[int | None, int] = {}
    for r in requests:
        dept_counts[r.department_id] = dept_counts.get(r.department_id, 0) + 1

    depts = {d.id: d.name for d in db.scalars(select(Department)).all()}
    by_dept = []
    for dept_id, count in sorted(dept_counts.items(), key=lambda x: x[1], reverse=True):
        label = depts.get(dept_id, "Unrouted Submissions") if dept_id else "Unrouted Submissions"
        by_dept.append(DistributionItem(label=label, value=count, key=dept_id))

    return DistributionsResponse(
        by_status=by_status,
        by_priority=by_priority,
        by_category=by_category,
        by_department=by_dept,
    )


@router.get("/department-performance", response_model=list[DepartmentPerformanceItem])
def get_department_performance(
    start_date: str | None = None,
    end_date: str | None = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[DepartmentPerformanceItem]:
    start_dt, end_dt = _parse_dates(start_date, end_date)

    departments = list(db.scalars(select(Department).order_by(Department.name)).all())
    active_officers = db.scalars(
        select(User).where(User.role == UserRole.OFFICER, User.is_active == True)
    ).all()

    officers_per_dept: dict[int, int] = {}
    for off in active_officers:
        if off.department_id:
            officers_per_dept[off.department_id] = officers_per_dept.get(off.department_id, 0) + 1

    results = []
    for dept in departments:
        req_query = select(ServiceRequest).where(ServiceRequest.department_id == dept.id)
        if start_dt:
            req_query = req_query.where(ServiceRequest.created_at >= start_dt)
        if end_dt:
            req_query = req_query.where(ServiceRequest.created_at <= end_dt)

        dept_requests = list(db.scalars(req_query).all())
        total = len(dept_requests)

        unassigned = sum(1 for r in dept_requests if r.assigned_officer_id is None)
        pending = sum(1 for r in dept_requests if r.status in {ServiceRequestStatus.SUBMITTED, ServiceRequestStatus.PENDING})
        in_progress = sum(1 for r in dept_requests if r.status == ServiceRequestStatus.IN_PROGRESS)
        resolved = sum(1 for r in dept_requests if r.status == ServiceRequestStatus.RESOLVED)
        closed = sum(1 for r in dept_requests if r.status == ServiceRequestStatus.CLOSED)

        resolved_ids = [r.id for r in dept_requests if r.status in {ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CLOSED}]
        avg_res_time = _compute_avg_resolution_hours(db, resolved_ids)

        resolution_rate = round(((resolved + closed) / total) * 100.0, 1) if total > 0 else 0.0

        # Department feedback
        dept_req_ids = [r.id for r in dept_requests]
        avg_rating = None
        if dept_req_ids:
            ratings = db.scalars(
                select(Feedback.rating).where(Feedback.service_request_id.in_(dept_req_ids))
            ).all()
            if ratings:
                avg_rating = round(sum(ratings) / len(ratings), 2)

        results.append(
            DepartmentPerformanceItem(
                department_id=dept.id,
                department_name=dept.name,
                department_code=dept.code,
                is_active=dept.is_active,
                total_requests=total,
                unassigned_requests=unassigned,
                pending_requests=pending,
                in_progress_requests=in_progress,
                resolved_requests=resolved,
                closed_requests=closed,
                avg_resolution_time_hours=avg_res_time,
                resolution_rate_percent=resolution_rate,
                officer_count=officers_per_dept.get(dept.id, 0),
                avg_satisfaction_rating=avg_rating,
            )
        )

    return sorted(results, key=lambda x: x.total_requests, reverse=True)


@router.get("/officer-workload", response_model=list[OfficerWorkloadItem])
def get_officer_workload(
    start_date: str | None = None,
    end_date: str | None = None,
    department_id: int | None = None,
    officer_id: int | None = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[OfficerWorkloadItem]:
    start_dt, end_dt = _parse_dates(start_date, end_date)

    query = select(User).where(User.role == UserRole.OFFICER)
    if department_id is not None:
        query = query.where(User.department_id == department_id)
    if officer_id is not None:
        query = query.where(User.id == officer_id)

    officers = list(db.scalars(query.order_by(User.name)).all())

    results = []
    for off in officers:
        # Currently assigned active (real-time snapshot)
        active_assigned_count = db.scalar(
            select(func.count(ServiceRequest.id)).where(
                ServiceRequest.assigned_officer_id == off.id,
                ServiceRequest.status.in_([ServiceRequestStatus.PENDING, ServiceRequestStatus.IN_PROGRESS]),
            )
        ) or 0

        # Handled in period: assigned to officer OR status changed by officer in status history
        handled_assigned_query = select(ServiceRequest.id).where(ServiceRequest.assigned_officer_id == off.id)
        if start_dt:
            handled_assigned_query = handled_assigned_query.where(ServiceRequest.created_at >= start_dt)
        if end_dt:
            handled_assigned_query = handled_assigned_query.where(ServiceRequest.created_at <= end_dt)

        assigned_req_ids = set(db.scalars(handled_assigned_query).all())

        history_handled_query = select(RequestStatusHistory.service_request_id).where(
            RequestStatusHistory.changed_by == off.id
        )
        if start_dt:
            history_handled_query = history_handled_query.where(RequestStatusHistory.created_at >= start_dt)
        if end_dt:
            history_handled_query = history_handled_query.where(RequestStatusHistory.created_at <= end_dt)

        history_req_ids = set(db.scalars(history_handled_query).all())
        total_handled_ids = assigned_req_ids.union(history_req_ids)

        # Resolved in period by or assigned to this officer
        resolved_hist_query = select(RequestStatusHistory.service_request_id).where(
            RequestStatusHistory.changed_by == off.id,
            RequestStatusHistory.new_status.in_(["RESOLVED", "CLOSED"]),
        )
        if start_dt:
            resolved_hist_query = resolved_hist_query.where(RequestStatusHistory.created_at >= start_dt)
        if end_dt:
            resolved_hist_query = resolved_hist_query.where(RequestStatusHistory.created_at <= end_dt)

        resolved_req_ids = set(db.scalars(resolved_hist_query).all())

        # Also include currently assigned resolved requests in period
        assigned_res_query = select(ServiceRequest.id).where(
            ServiceRequest.assigned_officer_id == off.id,
            ServiceRequest.status.in_([ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CLOSED]),
        )
        if start_dt:
            assigned_res_query = assigned_res_query.where(ServiceRequest.updated_at >= start_dt)
        if end_dt:
            assigned_res_query = assigned_res_query.where(ServiceRequest.updated_at <= end_dt)

        assigned_res_ids = set(db.scalars(assigned_res_query).all())
        all_resolved_ids = list(resolved_req_ids.union(assigned_res_ids))

        avg_res_time = _compute_avg_resolution_hours(db, all_resolved_ids)

        results.append(
            OfficerWorkloadItem(
                officer_id=off.id,
                officer_name=off.name,
                officer_email=off.email,
                department_id=off.department_id,
                department_name=off.department_name,
                is_active=off.is_active,
                currently_assigned_active=active_assigned_count,
                total_handled_period=len(total_handled_ids),
                resolved_period=len(all_resolved_ids),
                avg_resolution_time_hours=avg_res_time,
            )
        )

    return sorted(results, key=lambda x: (x.currently_assigned_active, x.total_handled_period), reverse=True)


@router.get("/feedback", response_model=FeedbackAnalyticsResponse)
def get_feedback_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    department_id: int | None = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> FeedbackAnalyticsResponse:
    start_dt, end_dt = _parse_dates(start_date, end_date)

    query = (
        select(Feedback, ServiceRequest)
        .join(ServiceRequest, ServiceRequest.id == Feedback.service_request_id)
    )
    if start_dt:
        query = query.where(Feedback.created_at >= start_dt)
    if end_dt:
        query = query.where(Feedback.created_at <= end_dt)
    if department_id is not None:
        query = query.where(ServiceRequest.department_id == department_id)

    pairs = db.execute(query.order_by(desc(Feedback.created_at))).all()

    ratings = [p[0].rating for p in pairs if p[0].rating is not None]
    total_submissions = len(ratings)
    avg_rating = round(sum(ratings) / total_submissions, 2) if total_submissions > 0 else None

    rating_dist = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for r in ratings:
        k = str(r)
        if k in rating_dist:
            rating_dist[k] += 1

    # Department summaries
    dept_map: dict[int, list[int]] = {}
    for fb, req in pairs:
        if req.department_id:
            dept_map.setdefault(req.department_id, []).append(fb.rating)

    all_depts = {d.id: d.name for d in db.scalars(select(Department)).all()}
    dept_summaries = []
    for d_id, d_ratings in dept_map.items():
        dept_summaries.append(
            DepartmentFeedbackSummary(
                department_id=d_id,
                department_name=all_depts.get(d_id, "Department"),
                average_rating=round(sum(d_ratings) / len(d_ratings), 2) if d_ratings else None,
                total_submissions=len(d_ratings),
            )
        )
    dept_summaries.sort(key=lambda x: x.total_submissions, reverse=True)

    recent = [
        RecentFeedbackItem(
            id=fb.id,
            service_request_id=fb.service_request_id,
            request_title=req.title,
            department_name=req.department_name,
            rating=fb.rating,
            comment=fb.comment,
            created_at=fb.created_at,
        )
        for fb, req in pairs[:15]
    ]

    return FeedbackAnalyticsResponse(
        average_rating=avg_rating,
        total_submissions=total_submissions,
        rating_distribution=rating_dist,
        department_summaries=dept_summaries,
        recent_feedback=recent,
    )


@router.get("/request-activity", response_model=RequestActivityResponse)
def get_request_activity(
    start_date: str | None = None,
    end_date: str | None = None,
    department_id: int | None = None,
    age_threshold_days: int = Query(default=7, ge=1, le=365),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> RequestActivityResponse:
    start_dt, end_dt = _parse_dates(start_date, end_date)

    # Created in period
    created_query = select(func.count(ServiceRequest.id))
    if start_dt:
        created_query = created_query.where(ServiceRequest.created_at >= start_dt)
    if end_dt:
        created_query = created_query.where(ServiceRequest.created_at <= end_dt)
    if department_id is not None:
        created_query = created_query.where(ServiceRequest.department_id == department_id)
    created_in_period = db.scalar(created_query) or 0

    # Resolved in period
    resolved_query = (
        select(func.count(RequestStatusHistory.id))
        .join(ServiceRequest, ServiceRequest.id == RequestStatusHistory.service_request_id)
        .where(RequestStatusHistory.new_status.in_(["RESOLVED", "CLOSED"]))
    )
    if start_dt:
        resolved_query = resolved_query.where(RequestStatusHistory.created_at >= start_dt)
    if end_dt:
        resolved_query = resolved_query.where(RequestStatusHistory.created_at <= end_dt)
    if department_id is not None:
        resolved_query = resolved_query.where(ServiceRequest.department_id == department_id)
    resolved_in_period = db.scalar(resolved_query) or 0

    # Unassigned open requests
    unassigned_query = select(func.count(ServiceRequest.id)).where(
        ServiceRequest.assigned_officer_id.is_(None),
        ServiceRequest.status.notin_([ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CLOSED]),
    )
    if department_id is not None:
        unassigned_query = unassigned_query.where(ServiceRequest.department_id == department_id)
    unassigned_count = db.scalar(unassigned_query) or 0

    # Stale open requests (older than age_threshold_days)
    threshold_dt = datetime.now() - timedelta(days=age_threshold_days)
    stale_query = (
        select(ServiceRequest)
        .where(
            ServiceRequest.status.notin_([ServiceRequestStatus.RESOLVED, ServiceRequestStatus.CLOSED]),
            ServiceRequest.created_at <= threshold_dt,
        )
    )
    if department_id is not None:
        stale_query = stale_query.where(ServiceRequest.department_id == department_id)

    stale_list = list(db.scalars(stale_query.order_by(ServiceRequest.created_at)).all())
    stale_count = len(stale_list)

    now = datetime.now()
    stale_items = [
        StaleRequestItem(
            id=r.id,
            title=r.title,
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            department_name=r.department_name,
            assigned_officer_name=r.assigned_officer_name,
            age_days=max(0, (now - r.created_at).days) if r.created_at else 0,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in stale_list[:10]
    ]

    # Status transition counts
    hist_query = (
        select(
            RequestStatusHistory.old_status,
            RequestStatusHistory.new_status,
            func.count(RequestStatusHistory.id).label("cnt"),
        )
        .join(ServiceRequest, ServiceRequest.id == RequestStatusHistory.service_request_id)
    )
    if start_dt:
        hist_query = hist_query.where(RequestStatusHistory.created_at >= start_dt)
    if end_dt:
        hist_query = hist_query.where(RequestStatusHistory.created_at <= end_dt)
    if department_id is not None:
        hist_query = hist_query.where(ServiceRequest.department_id == department_id)

    transitions = db.execute(
        hist_query.group_by(RequestStatusHistory.old_status, RequestStatusHistory.new_status)
    ).all()

    transition_items = [
        StatusTransitionCount(
            from_status="New" if row.old_status in {"NONE", None} else row.old_status,
            to_status=row.new_status,
            count=row.cnt,
        )
        for row in transitions
        if row.new_status
    ]

    return RequestActivityResponse(
        created_in_period=created_in_period,
        resolved_in_period=resolved_in_period,
        unassigned_count=unassigned_count,
        stale_open_requests_count=stale_count,
        age_threshold_days=age_threshold_days,
        status_transitions=transition_items,
        stale_requests=stale_items,
    )


@router.get("/export-csv")
def export_analytics_csv(
    report_type: str = Query(default="requests", pattern="^(requests|departments|officers|feedback)$"),
    start_date: str | None = None,
    end_date: str | None = None,
    department_id: int | None = None,
    status_filter: ServiceRequestStatus | None = Query(default=None, alias="status"),
    priority: str | None = None,
    category: str | None = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    start_dt, end_dt = _parse_dates(start_date, end_date)
    today_str = date.today().isoformat()
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "requests":
        writer.writerow([
            "Request ID",
            "Title",
            "Description",
            "Status",
            "Department",
            "Assigned Officer",
            "Category",
            "Priority",
            "Location Address",
            "Latitude",
            "Longitude",
            "Submitted At",
            "Last Activity",
        ])

        query = _apply_request_filters(
            select(ServiceRequest),
            start_dt=start_dt,
            end_dt=end_dt,
            department_id=department_id,
            status_filter=status_filter,
            priority=priority,
            category=category,
        ).order_by(desc(ServiceRequest.created_at))

        requests = db.scalars(query).all()
        for r in requests:
            writer.writerow([
                f"REQ-{String_id(r.id)}",
                r.title,
                r.description.replace("\n", " ") if r.description else "",
                r.status.value if hasattr(r.status, "value") else str(r.status),
                r.department_name or "Unassigned",
                r.assigned_officer_name or "Unassigned",
                r.category or "",
                r.priority or "",
                r.location or "",
                r.latitude or "",
                r.longitude or "",
                r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
                r.updated_at.strftime("%Y-%m-%d %H:%M:%S") if r.updated_at else "",
            ])
        filename = f"commonground_requests_report_{today_str}.csv"

    elif report_type == "departments":
        writer.writerow([
            "Department ID",
            "Department Name",
            "Code",
            "Status",
            "Total Requests",
            "Unassigned",
            "Pending",
            "In Progress",
            "Resolved",
            "Closed",
            "Resolution Rate %",
            "Active Officers",
        ])
        depts_data = get_department_performance(start_date, end_date, _, db)
        for d in depts_data:
            writer.writerow([
                d.department_id,
                d.department_name,
                d.department_code,
                "Active" if d.is_active else "Inactive",
                d.total_requests,
                d.unassigned_requests,
                d.pending_requests,
                d.in_progress_requests,
                d.resolved_requests,
                d.closed_requests,
                f"{d.resolution_rate_percent}%",
                d.officer_count,
            ])
        filename = f"commonground_departments_report_{today_str}.csv"

    elif report_type == "officers":
        writer.writerow([
            "Officer ID",
            "Name",
            "Email",
            "Department",
            "Status",
            "Currently Assigned Active",
            "Total Handled In Period",
            "Resolved In Period",
            "Avg Resolution Time (hrs)",
        ])
        officers_data = get_officer_workload(start_date, end_date, department_id, None, _, db)
        for o in officers_data:
            writer.writerow([
                o.officer_id,
                o.officer_name,
                o.officer_email,
                o.department_name or "None",
                "Active" if o.is_active else "Inactive",
                o.currently_assigned_active,
                o.total_handled_period,
                o.resolved_period,
                o.avg_resolution_time_hours if o.avg_resolution_time_hours is not None else "N/A",
            ])
        filename = f"commonground_officers_report_{today_str}.csv"

    else:  # feedback
        writer.writerow([
            "Feedback ID",
            "Request ID",
            "Request Title",
            "Department",
            "Rating (1-5)",
            "Comments",
            "Submitted Date",
        ])
        fb_data = get_feedback_analytics(start_date, end_date, department_id, _, db)
        for f in fb_data.recent_feedback:
            writer.writerow([
                f.id,
                f"REQ-{String_id(f.service_request_id)}",
                f.request_title,
                f.department_name or "Unassigned",
                f.rating,
                f.comment or "",
                f.created_at.strftime("%Y-%m-%d %H:%M:%S") if f.created_at else "",
            ])
        filename = f"commonground_feedback_report_{today_str}.csv"

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def String_id(num: int) -> str:
    return str(num).padStart(3, "0") if hasattr(str(num), "padStart") else f"{num:03d}"
