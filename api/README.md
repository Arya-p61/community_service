# Community Service API

## Run

From the repository root:

```powershell
cd api
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Set `GEMINI_API_KEY` in `.env` to enable live classification. The key is used only by FastAPI and is never sent to React. If it is missing or Gemini is unavailable, service requests are still saved and the prediction is recorded as `FAILED` with controlled fallback values.

## Module 3 flow

A service request is saved first with an initial `PENDING` prediction. A background task then sends only the title, description, and location to the isolated Gemini service. The response is parsed as JSON, normalized against the controlled categories and priorities, mapped to a backend-owned department, and stored as a new `AIPrediction` record.

Classification is not run automatically by the request details page. The page reads the latest result and exposes explicit analyze, retry, and re-analyze actions.

## Controlled values

Categories:

- Waste Management
- Road Damage
- Water Supply
- Streetlight
- Drainage
- Public Health
- Public Infrastructure
- Other

Priorities:

- Low
- Medium
- High
- Critical

Departments are assigned by the backend:

- Road Damage: Public Works
- Water Supply: Water Department
- Streetlight: Electrical
- Waste Management: Waste Management
- Drainage: Sanitation
- Public Health: Health
- Public Infrastructure: Public Works
- Other: General Services

Unknown categories become `Other`; unknown priorities become `Medium`; confidence is clamped to `0..1`. Missing summary and action values use safe fallbacks.

## Endpoints

All endpoints require the existing Bearer JWT and enforce request ownership. Officers and admins may access requests for classification purposes.

```text
POST /api/service-requests/{request_id}/classify
GET  /api/service-requests/{request_id}/classification
```

`POST` creates a new prediction rather than overwriting history. `GET` returns the latest prediction, including `PENDING`, `COMPLETED`, or `FAILED` processing status.

Images are not sent to Gemini. Image analysis, duplicate detection, notifications, and advanced analytics are intentionally outside this module.

## Module 4 workflow

Startup creates the `departments`, `request_status_history`, and `request_notes` tables and safely adds the nullable `department_id` and `assigned_officer_id` columns to existing tables. The seven default departments are seeded idempotently.

Department and officer endpoints use the existing JWT roles:

```text
GET    /api/departments
POST   /api/departments                 (admin)
PATCH  /api/departments/{id}            (admin)
DELETE /api/departments/{id}            (admin, deactivates)
GET    /api/admin/officers              (admin)
POST   /api/admin/officers              (admin)
PATCH  /api/admin/officers/{id}         (admin)
GET    /api/officer/requests            (officer)
GET    /api/officer/requests/{id}       (officer)
POST   /api/officer/requests/{id}/claim (officer)
POST   /api/officer/requests/{id}/unclaim (officer)
PATCH  /api/officer/requests/{id}/status (officer)
POST   /api/officer/requests/{id}/notes (officer)
GET    /api/officer/requests/{id}/notes (officer)
GET    /api/admin/requests              (admin)
PATCH  /api/admin/requests/{id}/assignment (admin)
PATCH  /api/admin/requests/{id}/status  (admin)
```

Successful AI classifications route a request through the existing controlled category mapping. Officers can only see their department, claim unassigned requests, update assigned request status through valid transitions, and view internal notes. Citizens never receive internal notes. Admins bypass department restrictions but cannot assign an officer to a different department.
