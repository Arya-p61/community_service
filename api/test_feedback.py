import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.department import Department
from app.models.feedback import Feedback
from app.models.service_request import ServiceRequest, ServiceRequestStatus
from app.models.user import User, UserRole


client = TestClient(app)


@pytest.fixture(scope="module")
def setup_data():
    db = SessionLocal()
    # Ensure department
    dept = db.scalar(select(Department).where(Department.code == "PUBLIC_WORKS"))
    if not dept:
        dept = Department(name="Public Works", code="PUBLIC_WORKS", description="Roads", is_active=True)
        db.add(dept)
        db.commit()
        db.refresh(dept)

    # Citizen 1
    c1 = db.scalar(select(User).where(User.email == "test_c1_fb@test.com"))
    if not c1:
        c1 = User(name="Test Citizen One", email="test_c1_fb@test.com", phone="1111111111", password_hash=hash_password("password"), role=UserRole.CITIZEN)
        db.add(c1)
        db.commit()
        db.refresh(c1)

    # Citizen 2
    c2 = db.scalar(select(User).where(User.email == "test_c2_fb@test.com"))
    if not c2:
        c2 = User(name="Test Citizen Two", email="test_c2_fb@test.com", phone="2222222222", password_hash=hash_password("password"), role=UserRole.CITIZEN)
        db.add(c2)
        db.commit()
        db.refresh(c2)

    # Admin
    adm = db.scalar(select(User).where(User.email == "test_admin_fb@test.com"))
    if not adm:
        adm = User(name="Test Admin", email="test_admin_fb@test.com", phone="3333333333", password_hash=hash_password("password"), role=UserRole.ADMIN)
        db.add(adm)
        db.commit()
        db.refresh(adm)

    # Clean existing feedback on test requests if any
    req = db.scalar(select(ServiceRequest).where(ServiceRequest.title == "Feedback Test Pothole"))
    if req:
        db.query(Feedback).filter(Feedback.service_request_id == req.id).delete()
        db.delete(req)
        db.commit()

    # Create Service Request for Citizen 1 in SUBMITTED state
    req = ServiceRequest(
        user_id=c1.id,
        department_id=dept.id,
        title="Feedback Test Pothole",
        description="Deep pothole test description",
        location="123 Civic Ave",
        status=ServiceRequestStatus.SUBMITTED,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    token_c1 = create_access_token(c1.id, c1.role.value)
    token_c2 = create_access_token(c2.id, c2.role.value)
    token_adm = create_access_token(adm.id, adm.role.value)

    db.close()

    return {
        "c1": c1,
        "c2": c2,
        "adm": adm,
        "token_c1": token_c1,
        "token_c2": token_c2,
        "token_adm": token_adm,
        "req_id": req.id,
    }


def test_cannot_rate_unfinished_request(setup_data):
    token = setup_data["token_c1"]
    req_id = setup_data["req_id"]
    # Currently SUBMITTED
    response = client.post(
        f"/api/service-requests/{req_id}/feedback",
        headers={"Authorization": f"Bearer {token}"},
        json={"rating": 5, "comment": "Too fast!"},
    )
    assert response.status_code == 400
    assert "resolved or closed" in response.json()["detail"].lower()


def test_cannot_rate_another_users_request(setup_data):
    token_c2 = setup_data["token_c2"]
    req_id = setup_data["req_id"]
    response = client.post(
        f"/api/service-requests/{req_id}/feedback",
        headers={"Authorization": f"Bearer {token_c2}"},
        json={"rating": 5, "comment": "Not mine"},
    )
    assert response.status_code == 403


def test_rating_out_of_bounds_rejected(setup_data):
    token = setup_data["token_c1"]
    req_id = setup_data["req_id"]
    # Set status to RESOLVED
    db = SessionLocal()
    req = db.get(ServiceRequest, req_id)
    req.status = ServiceRequestStatus.RESOLVED
    db.commit()
    db.close()

    # rating = 6
    r_high = client.post(
        f"/api/service-requests/{req_id}/feedback",
        headers={"Authorization": f"Bearer {token}"},
        json={"rating": 6, "comment": "Too high"},
    )
    assert r_high.status_code == 422

    # rating = 0
    r_low = client.post(
        f"/api/service-requests/{req_id}/feedback",
        headers={"Authorization": f"Bearer {token}"},
        json={"rating": 0, "comment": "Too low"},
    )
    assert r_low.status_code == 422


def test_submit_valid_feedback_and_duplicate_prevention(setup_data):
    token = setup_data["token_c1"]
    req_id = setup_data["req_id"]

    # Submit valid feedback
    res = client.post(
        f"/api/service-requests/{req_id}/feedback",
        headers={"Authorization": f"Bearer {token}"},
        json={"rating": 5, "comment": "Pothole filled cleanly within 48 hours. Excellent service!"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["rating"] == 5
    assert data["comment"] == "Pothole filled cleanly within 48 hours. Excellent service!"
    assert data["service_request_id"] == req_id

    # Duplicate attempt
    dup = client.post(
        f"/api/service-requests/{req_id}/feedback",
        headers={"Authorization": f"Bearer {token}"},
        json={"rating": 4, "comment": "Duplicate attempt"},
    )
    assert dup.status_code == 409
    assert "already been submitted" in dup.json()["detail"].lower()


def test_get_and_patch_feedback(setup_data):
    token = setup_data["token_c1"]
    req_id = setup_data["req_id"]

    # Get request feedback
    res = client.get(
        f"/api/service-requests/{req_id}/feedback",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["rating"] == 5

    # Update feedback
    patch_res = client.patch(
        f"/api/service-requests/{req_id}/feedback",
        headers={"Authorization": f"Bearer {token}"},
        json={"rating": 4, "comment": "Adjusted rating after inspection."},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["rating"] == 4
    assert patch_res.json()["comment"] == "Adjusted rating after inspection."


def test_get_my_feedback(setup_data):
    token = setup_data["token_c1"]
    res = client.get(
        "/api/feedback/my",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(f["service_request_id"] == setup_data["req_id"] for f in data)


def test_admin_feedback_overview(setup_data):
    token_c1 = setup_data["token_c1"]
    token_adm = setup_data["token_adm"]

    # Citizen cannot access admin feedback
    cit_res = client.get(
        "/api/admin/feedback",
        headers={"Authorization": f"Bearer {token_c1}"},
    )
    assert cit_res.status_code == 403

    # Admin access
    adm_res = client.get(
        "/api/admin/feedback",
        headers={"Authorization": f"Bearer {token_adm}"},
    )
    assert adm_res.status_code == 200
    data = adm_res.json()
    assert "total_feedback" in data
    assert "average_rating" in data
    assert "rating_distribution" in data
    assert "department_breakdown" in data
    assert "items" in data
    assert data["total_feedback"] >= 1
    assert data["rating_distribution"]["4"] >= 1
