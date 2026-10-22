from datetime import datetime
from pydantic import BaseModel, ConfigDict


class OverviewAnalytics(BaseModel):
    total_requests: int
    submitted_requests: int
    pending_requests: int
    in_progress_requests: int
    resolved_requests: int
    closed_requests: int
    unassigned_requests: int
    unrouted_requests: int
    ai_classified_count: int = 0
    avg_resolution_time_hours: float | None = None
    avg_satisfaction_rating: float | None = None
    total_feedback_count: int = 0
    resolution_rate_percent: float = 0.0

    # Frontend convenience aliases
    submitted_count: int = 0
    pending_count: int = 0
    in_progress_count: int = 0
    resolved_count: int = 0
    closed_count: int = 0
    unassigned_count: int = 0
    unrouted_count: int = 0
    resolution_rate: float = 0.0
    avg_resolution_hours: float | None = None
    avg_satisfaction: float | None = None


class TimeBucket(BaseModel):
    date: str
    received: int
    resolved: int
    label: str = ""
    count: int = 0


class DistributionItem(BaseModel):
    label: str
    value: int
    color: str | None = None
    key: str | int | None = None


class DistributionsResponse(BaseModel):
    by_status: list[DistributionItem]
    by_priority: list[DistributionItem]
    by_category: list[DistributionItem]
    by_department: list[DistributionItem]


class DepartmentPerformanceItem(BaseModel):
    department_id: int
    department_name: str
    department_code: str
    is_active: bool
    total_requests: int
    unassigned_requests: int
    pending_requests: int
    in_progress_requests: int
    resolved_requests: int
    closed_requests: int
    avg_resolution_time_hours: float | None
    resolution_rate_percent: float
    officer_count: int
    avg_satisfaction_rating: float | None

    # Frontend convenience aliases
    open_requests: int = 0
    resolution_rate: float = 0.0
    avg_resolution_hours: float | None = None
    avg_rating: float | None = None


class OfficerWorkloadItem(BaseModel):
    officer_id: int
    officer_name: str
    officer_email: str
    department_id: int | None
    department_name: str | None
    is_active: bool
    currently_assigned_active: int
    total_handled_period: int
    resolved_period: int
    avg_resolution_time_hours: float | None

    # Frontend convenience aliases
    open_requests: int = 0
    resolved_requests: int = 0
    total_assigned: int = 0
    avg_resolution_hours: float | None = None


class RecentFeedbackItem(BaseModel):
    id: int
    service_request_id: int
    request_title: str
    department_name: str | None
    rating: int
    comment: str | None
    created_at: datetime


class DepartmentFeedbackSummary(BaseModel):
    department_id: int
    department_name: str
    average_rating: float | None
    total_submissions: int
    feedback_count: int = 0
    avg_rating: float | None = None


class FeedbackAnalyticsResponse(BaseModel):
    average_rating: float | None
    total_submissions: int
    rating_distribution: dict[str, int]
    department_summaries: list[DepartmentFeedbackSummary]
    recent_feedback: list[RecentFeedbackItem]

    # Frontend convenience aliases
    total_feedback: int = 0
    avg_rating: float | None = None
    feedback_rate: float | None = None
    department_feedback: list[DepartmentFeedbackSummary] = []


class StatusTransitionCount(BaseModel):
    from_status: str
    to_status: str
    count: int


class StaleRequestItem(BaseModel):
    id: int
    title: str
    status: str
    department_name: str | None
    assigned_officer_name: str | None
    age_days: int
    created_at: datetime
    updated_at: datetime


class RequestActivityResponse(BaseModel):
    created_in_period: int
    resolved_in_period: int
    unassigned_count: int
    stale_open_requests_count: int
    age_threshold_days: int
    status_transitions: list[StatusTransitionCount]
    stale_requests: list[StaleRequestItem]
