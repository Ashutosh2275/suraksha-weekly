"""URL-path based API version detection middleware."""

from __future__ import annotations

import re
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class VersionMiddleware(BaseHTTPMiddleware):
    _VERSION_PATTERN = re.compile(r"^/api/(v\d+)(?:/|$)")

    def __init__(self, app, *, deprecated_versions: dict[str, str] | None = None) -> None:  # noqa: ANN001
        super().__init__(app)
        self.deprecated_versions = {k.lower(): v for k, v in (deprecated_versions or {}).items()}

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        response = await call_next(request)
        version = self._extract_version(request.url.path)
        if version is None:
            return response

        response.headers["X-API-Version"] = version
        sunset = self.deprecated_versions.get(version.lower())
        if sunset:
            response.headers["Deprecation"] = "true"
            response.headers["Sunset"] = sunset
        return response

    def _extract_version(self, path: str) -> str | None:
        match = self._VERSION_PATTERN.match(path)
        if not match:
            return None
        return match.group(1)
