# Community Service Request Management System

## Modules 1 and 2 - Foundation, Authentication & Service Requests

The project provides custom-user authentication, JWT sessions, role-based access, profile management, and citizen service-request workflows. AI classification, departments, notifications, feedback, maps, analytics, and chat are intentionally reserved for later modules.

## Technologies

- React, Vite, React Router, Axios, Tailwind CSS
- Django, Django REST Framework, Simple JWT, django-cors-headers
- MySQL (with a SQLite development fallback when `DB_NAME` is empty)

## Project structure

```text
community_service/
├── frontend/
│   ├── src/components, context, hooks, layouts, pages, services, utils, assets
│   └── package.json
└── backend/
    ├── manage.py
    ├── config/
    ├── users/
    ├── service_requests/
    ├── media/ (created at runtime for local uploads)
    └── requirements.txt
```

## Setup

### Database and backend

1. Create a MySQL database named `community_service_db`.
2. Copy `backend/.env.example` to `backend/.env` and set the MySQL credentials. Leaving `DB_NAME` empty uses SQLite for local checks.
3. Run:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API runs at `http://localhost:8000`. The Django admin is at `/admin/`.

Uploaded request images are stored locally under `backend/media/request_images/` during development. Set `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` in `backend/.env` to use MySQL; leaving `DB_NAME` empty uses SQLite for local checks.

### Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

The Vite app runs at `http://localhost:5173` and uses `VITE_API_URL` for the Django API base URL.

## Authentication behavior

Public registration always creates a `citizen`; role selection is never accepted from the client. Officers can be created or promoted by an administrator. JWT access tokens last 30 minutes and refresh tokens last 7 days. The Axios interceptor refreshes expired access tokens; logout removes both tokens and the cached user from browser storage. The backend also blacklists rotated refresh tokens.

Protected routes enforce roles in the client for navigation, while the backend enforces authentication and administrator permissions on every API request.

## Pages

- `/login`
- `/register`
- `/forgot-password` (UI placeholder until email delivery is added)
- `/profile`
- `/citizen/dashboard`, `/officer/dashboard`, `/admin/dashboard`
- `/citizen/requests`
- `/citizen/requests/new`
- `/citizen/requests/:id`

## Module 2 API

All request endpoints use `Authorization: Bearer <access-token>` and operate on the authenticated citizen’s own records:

- `POST /api/requests/` creates a request with `SUBMITTED` status.
- `GET /api/requests/` lists only the authenticated citizen’s requests.
- `GET /api/requests/<id>/` retrieves one owned request.
- `PATCH /api/requests/<id>/` updates title, description, location, coordinates, or image while status is `SUBMITTED` or `PENDING`.
- `DELETE /api/requests/<id>/` cancels by deleting only while status is `SUBMITTED` or `PENDING`.

The backend assigns ownership from `request.user`; client-supplied `user_id` and `status` values are ignored. Request images accept JPG, JPEG, PNG, and WEBP up to 5 MB.

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for request and response details."# community_service" 
