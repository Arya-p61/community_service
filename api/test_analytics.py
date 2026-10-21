import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.department import Department
from app.models.user import User, UserRole

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_analytics_data():
    db = SessionLocal()

    # Department
    dept = db.scalar(select(Department).where(Department.code == "PUBLIC_WORKS"))
    if not dept:
        dept = Department(name="Public Works", code="PUBLIC_WORKS", description="Roads", is_active=True)
        db.add(dept)
        db.commit()
        db.refresh(dept)

    # Admin
    admin = db.scalar(select(User).where(User.email == "test_analytics_admin@test.com"))
    if not admin:
        admin = User(
            name="Analytics Admin",
            email="test_analytics_admin@test.com",
            phone="8887776665",
            password_hash=hash_password("password"),
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    # Citizen
    citizen = db.scalar(select(User).where(User.email == "test_analytics_citizen@test.com"))
    if not citizen:
        citizen = User(
            name="Analytics Citizen",
            email="test_analytics_citizen@test.com",
            phone="8887776664",
            password_hash=hash_password("password"),
            role=UserRole.CITIZEN,
        )
        db.add(citizen)
        db.commit()
        db.refresh(citizen)

    # Officer
    officer = db.scalar(select(User).where(User.email == "test_analytics_officer@test.com"))
    if not officer:
        officer = User(
            name="Analytics Officer",
            email="test_analytics_officer@test.com",
            phone="8887776663",
            password_hash=hash_password("password"),
            role=UserRole.OFFICER,
            department_id=dept.id,
            is_active=True,
        )
        db.add(officer)
        db.commit()
        db.refresh(officer)

    data = {
        "admin_id": admin.id,
        "admin_role": admin.role.value,
        "citizen_id": citizen.id,
        "citizen_role": citizen.role.value,
        "officer_id": officer.id,
        "officer_role": officer.role.value,
        "dept_id": dept.id,
    }
    db.close()
    return data


def test_admin_can_access_overview(setup_analytics_data):
    token = create_access_token(setup_analytics_data["admin_id"], setup_analytics_data["admin_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/analytics/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_requests" in data
    assert "resolution_rate_percent" in data
    assert "submitted_requests" in data
    assert "resolved_requests" in data


def test_citizen_forbidden_from_analytics(setup_analytics_data):
    token = create_access_token(setup_analytics_data["citizen_id"], setup_analytics_data["citizen_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/analytics/overview", headers=headers)
    assert res.status_code == 403


def test_officer_forbidden_from_analytics(setup_analytics_data):
    token = create_access_token(setup_analytics_data["officer_id"], setup_analytics_data["officer_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/analytics/overview", headers=headers)
    assert res.status_code == 403


def test_invalid_date_range_validation(setup_analytics_data):
    token = create_access_token(setup_analytics_data["admin_id"], setup_analytics_data["admin_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(
        "/api/admin/analytics/overview?start_date=2026-12-01&end_date=2026-01-01",
        headers=headers,
    )
    assert res.status_code == 400
    assert "start_date cannot be later than end_date" in res.json()["detail"]


def test_distribution_analytics(setup_analytics_data):
    token = create_access_token(setup_analytics_data["admin_id"], setup_analytics_data["admin_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/analytics/distribution", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "by_status" in data
    assert "by_priority" in data
    assert "by_category" in data
    assert "by_department" in data


def test_department_performance(setup_analytics_data):
    token = create_access_token(setup_analytics_data["admin_id"], setup_analytics_data["admin_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/analytics/department-performance", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        assert "department_name" in data[0]
        assert "resolution_rate_percent" in data[0]


def test_officer_workload(setup_analytics_data):
    token = create_access_token(setup_analytics_data["admin_id"], setup_analytics_data["admin_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/analytics/officer-workload", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        assert "officer_name" in data[0]
        assert "currently_assigned_active" in data[0]


def test_feedback_analytics(setup_analytics_data):
    token = create_access_token(setup_analytics_data["admin_id"], setup_analytics_data["admin_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/analytics/feedback", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "rating_distribution" in data
    assert "department_summaries" in data


def test_request_activity(setup_analytics_data):
    token = create_access_token(setup_analytics_data["admin_id"], setup_analytics_data["admin_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/analytics/request-activity", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "created_in_period" in data
    assert "stale_open_requests_count" in data
    assert "status_transitions" in data


def test_export_csv_requests(setup_analytics_data):
    token = create_access_token(setup_analytics_data["admin_id"], setup_analytics_data["admin_role"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/analytics/export-csv?report_type=requests", headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]
    content = res.text
    assert "Request ID" in content
    assert "Title" in content
    assert "Status" in content
