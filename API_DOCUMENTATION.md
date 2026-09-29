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