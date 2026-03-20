"""
Shared custom exceptions for Suraksha Weekly API.

ServiceUnavailableError — raised when an external API is unreachable and
neither a Redis cache hit nor a mock-data fallback is available.
Returns HTTP 503 with a machine-readable body so the frontend can display
a friendly degraded-state banner instead of a generic error screen.
"""
from fastapi import HTTPException
from fastapi import status as http_status


class ServiceUnavailableError(HTTPException):
    """
    Raised when an external dependency (weather, AQI, forecast API) is
    unavailable and no cached or mock data can satisfy the request.

    HTTP 503 body:
        {
          "detail":     "<human-readable message>",
          "error_code": "EXTERNAL_API_UNAVAILABLE",
          "api":        "<api_name>"
        }
    """

    def __init__(self, message: str, api_name: str = "unknown") -> None:
        super().__init__(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "detail":     message,
                "error_code": "EXTERNAL_API_UNAVAILABLE",
                "api":        api_name,
            },
        )
