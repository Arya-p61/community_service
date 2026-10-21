import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.service_request import ServiceRequest, ServiceRequestStatus
from app.models.user import User, UserRole

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_location_data():
    db = SessionLocal()
    citizen = db.scalar(select(User).where(User.email == "test_location_citizen@test.com"))
    if not citizen:
        citizen = User(
            name="Location Citizen",
            email="test_location_citizen@test.com",
            phone="9998887776",
            password_hash=hash_password("password"),
            role=UserRole.CITIZEN,
        )
        db.add(citizen)
        db.commit()
        db.refresh(citizen)
    db.close()
    return citizen


def test_create_request_with_valid_coordinates(setup_location_data):
    citizen = setup_location_data
    token = create_access_token(citizen.id, citizen.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Water Leak on Park Street",
        "description": "Underground pipe leaking near community playground.",
        "location": "Park Street Community Park",
        "latitude": 12.971598,
        "longitude": 77.594562,
    }
    response = client.post("/api/service-requests", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["latitude"] == pytest.approx(12.971598)
    assert data["longitude"] == pytest.approx(77.594562)
    assert data["location"] == "Park Street Community Park"


def test_create_request_without_coordinates(setup_location_data):
    citizen = setup_location_data
    token = create_access_token(citizen.id, citizen.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Noise Complaint",
        "description": "Loud construction noise late at night.",
        "location": "Downtown Square",
    }
    response = client.post("/api/service-requests", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["latitude"] is None
    assert data["longitude"] is None


def test_reject_invalid_latitude(setup_location_data):
    citizen = setup_location_data
    token = create_access_token(citizen.id, citizen.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Invalid Lat Issue",
        "description": "Testing out-of-bounds latitude.",
        "latitude": 95.0,  # Invalid: max is 90
        "longitude": 77.0,
    }
    response = client.post("/api/service-requests", json=payload, headers=headers)
    assert response.status_code == 422


def test_reject_invalid_longitude(setup_location_data):
    citizen = setup_location_data
    token = create_access_token(citizen.id, citizen.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Invalid Long Issue",
        "description": "Testing out-of-bounds longitude.",
        "latitude": 12.0,
        "longitude": -195.0,  # Invalid: min is -180
    }
    response = client.post("/api/service-requests", json=payload, headers=headers)
    assert response.status_code == 422
