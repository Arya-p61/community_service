import json
from collections.abc import Mapping

from pydantic import ValidationError

from app.core.config import settings
from app.schemas.ai_prediction import AIClassificationResponse

ALLOWED_CATEGORIES = {
    "Waste Management",
    "Road Damage",
    "Water Supply",
    "Streetlight",
    "Drainage",
    "Public Health",
    "Public Infrastructure",
    "Other",
}
ALLOWED_PRIORITIES = {"Low", "Medium", "High", "Critical"}
DEPARTMENT_BY_CATEGORY = {
    "Road Damage": "Public Works",
    "Water Supply": "Water Department",
    "Streetlight": "Electrical",
    "Waste Management": "Waste Management",
    "Drainage": "Sanitation",
    "Public Health": "Health",
    "Public Infrastructure": "Public Works",
    "Other": "General Services",
}
FALLBACK_ACTION = "Review the reported issue and assign it to the appropriate service department."


class AIServiceError(RuntimeError):
    pass


def _log_gemini_exception(exc: Exception) -> None:
    status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    response = getattr(exc, "response", None)
    if status_code is None and response is not None:
        status_code = getattr(response, "status_code", None)
    message = str(exc)
    if settings.GEMINI_API_KEY:
        message = message.replace(settings.GEMINI_API_KEY, "[REDACTED]")
    print(f"Gemini API key loaded: {bool(settings.GEMINI_API_KEY)}", flush=True)
    print(f"Gemini model: {settings.GEMINI_MODEL}", flush=True)
    print(f"Gemini exception type: {type(exc).__name__}", flush=True)
    print(f"Gemini HTTP status: {status_code}", flush=True)
    print(f"Gemini error: {message}", flush=True)


def _fallback_summary(description: str) -> str:
    cleaned = " ".join(description.split())
    return cleaned[:300] or "The citizen reported a community service issue."


def validate_classification(raw: Mapping[str, object], description: str) -> AIClassificationResponse:
    category_value = str(raw.get("category", "")).strip()
    category_lookup = {category.lower(): category for category in ALLOWED_CATEGORIES}
    category = category_lookup.get(category_value.lower(), "Other")

    priority_value = str(raw.get("priority", "")).strip()
    priority_lookup = {priority.lower(): priority for priority in ALLOWED_PRIORITIES}
    priority = priority_lookup.get(priority_value.lower(), "Medium")

    summary = str(raw.get("summary") or "").strip() or _fallback_summary(description)
    suggested_action = str(raw.get("suggested_action") or "").strip() or FALLBACK_ACTION
    try:
        confidence = float(raw.get("confidence", 0.5))
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    try:
        return AIClassificationResponse(
            category=category,
            priority=priority,
            summary=summary,
            suggested_action=suggested_action,
            confidence=confidence,
        )
    except ValidationError as exc:
        raise AIServiceError("The AI response could not be validated") from exc


def _prompt(title: str, description: str, location: str | None) -> str:
    return f"""You are an AI assistant for a community service request management system.

Analyze the citizen's service request.

Allowed categories: Waste Management, Road Damage, Water Supply, Streetlight, Drainage, Public Health, Public Infrastructure, Other.
Allowed priorities: Low, Medium, High, Critical.

Return ONLY valid JSON with exactly these fields: category, priority, summary, suggested_action, confidence.
Do not invent categories. Use Other when the complaint does not fit. Priority should represent urgency and potential public impact. Confidence must be a number from 0 to 1. Summary must be concise and suggested_action must be practical. Do not include markdown or explanatory text outside JSON.

Title: {title}
Description: {description}
Location: {location or "Not provided"}
"""


async def classify_request(title: str, description: str, location: str | None) -> AIClassificationResponse:
    if not settings.GEMINI_API_KEY:
        error = AIServiceError("Gemini API key is not configured")
        _log_gemini_exception(error)
        raise error

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=_prompt(title, description, location),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        raw_response = (response.text or "").strip()
        if not raw_response:
            raise AIServiceError("Gemini returned an empty response")
        return validate_classification(json.loads(raw_response), description)
    except AIServiceError as exc:
        _log_gemini_exception(exc)
        raise
    except (json.JSONDecodeError, TypeError, ValueError, OSError) as exc:
        _log_gemini_exception(exc)
        raise AIServiceError("Gemini returned an invalid response") from exc
    except Exception as exc:
        _log_gemini_exception(exc)
        raise AIServiceError("Gemini classification is currently unavailable") from exc