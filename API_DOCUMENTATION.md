# Authentication API

Base URL: `http://localhost:8000/api/auth`

## `POST /register/`

Authentication: none. Creates a citizen account.

Request:

```json
{"name":"John Doe","email":"john@example.com","phone":"9876543210","password":"SecurePassword123","confirm_password":"SecurePassword123"}
```

Response `201`:

```json
{"success":true,"message":"Account created successfully.","user":{"id":1,"name":"John Doe","email":"john@example.com","phone":"9876543210","role":"citizen","profile_image":"","is_active":true,"created_at":"2026-09-29T12:00:00Z"}}
```

Errors: `400` for missing fields, duplicate/invalid email, invalid phone, weak password, or mismatched passwords.

## `POST /login/`

Authentication: none.

Request: `{"email":"john@example.com","password":"SecurePassword123"}`

Response `200`: `{ "access": "...", "refresh": "...", "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "citizen" } }`

Errors: `401` for invalid credentials or inactive accounts.

## `POST /token/refresh/`

Authentication: none. Request: `{"refresh":"<refresh-token>"}`. Returns `200` with a new access token and, when rotation is enabled, a new refresh token. Invalid or expired tokens return `401`.

## `GET /me/`

Authentication: `Authorization: Bearer <access-token>`.

Returns `200` with the authenticated user profile. Invalid or missing tokens return `401`.

## `PATCH /profile/`

Authentication: `Authorization: Bearer <access-token>`.

Request fields: `name`, `phone`, and `profile_image`. Email and role cannot be changed through this endpoint. Returns `200` with the updated profile, or `400` for invalid values.

## Administrator user management

`GET /users/` and `GET/PATCH /users/<id>/` require a JWT for a user with role `admin`. Admins may change `role` and `is_active`; citizens and officers receive `403`. Public registration cannot create an admin.

## Logout

Logout is handled by the frontend: it deletes the local access token, refresh token, and cached profile. Refresh-token rotation and blacklist support prevent rotated refresh tokens from being reused. A server-side access-token blacklist is not needed because access tokens are short-lived.

# Service Request API

Base URL: `http://localhost:8000/api/requests`

All endpoints require `Authorization: Bearer <access-token>`. Citizens can only access their own requests.

## `POST /`

Creates a request. Use JSON for text-only requests or multipart form data when attaching an image. Required fields are `title`, `description`, and `location`; `latitude`, `longitude`, and `image` are optional. The backend sets `user` from the JWT and always sets `status` to `SUBMITTED`.

## `GET /`

Returns the authenticated citizen’s requests only. No user ID is accepted from the client.

## `GET /<id>/`

Returns one owned request. A request owned by another citizen is indistinguishable from a missing request and returns `404`.

## `PATCH /<id>/`

Updates `title`, `description`, `location`, `latitude`, `longitude`, or `image`. `user`, `status`, `created_at`, and `updated_at` are read-only. Editing is rejected once a request is `IN_PROGRESS`, `RESOLVED`, or `CLOSED`.

## `DELETE /<id>/`

Cancels the request by deleting it while status is `SUBMITTED` or `PENDING`. Deletion is rejected after work has progressed.

Supported statuses are `SUBMITTED`, `PENDING`, `IN_PROGRESS`, `RESOLVED`, and `CLOSED`. Image uploads are stored under local `MEDIA_ROOT/request_images/` and limited to 5 MB.