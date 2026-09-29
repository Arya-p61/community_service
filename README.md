# Community Service Request Management System

## Module 1 - Foundation & Authentication

This module provides the foundation for a civic service platform: custom-user authentication, JWT sessions, role-based access, profile management, and responsive React pages. Complaint workflows, AI classification, departments, notifications, feedback, maps, analytics, and chat are intentionally reserved for later modules.

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

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for request and response details."# community_service" 
