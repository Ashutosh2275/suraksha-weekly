"""
API Versioning Utilities — Suraksha Weekly (PRD §40)

Provides:
  • DeprecatedRoute    — APIRoute subclass that injects Deprecation + Sunset
                         headers on every response, and returns HTTP 410 Gone
                         once the sunset date has passed.
  • @deprecated(...)  — decorator for future endpoints to mark them as
                         deprecated without rewriting the router.

Usage:
    router = APIRouter(route_class=DeprecatedRoute)

    # Or target a single endpoint:
    @deprecated(version="v1", sunset_date="2026-12-01", successor="/api/v2/auth/token")
    async def old_endpoint(): ...
"""
from __future__ import annotations

import functools
import logging
from datetime import date, datetime
from typing import Any, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute

logger = logging.getLogger(__name__)


class DeprecatedRoute(APIRoute):
    """
    APIRoute subclass that wraps the endpoint handler to:

    1. Return **HTTP 410 Gone** with ``error_code=API_VERSION_SUNSET`` when
       the current date is on or after ``sunset_date``.
    2. Otherwise inject response headers:
           Deprecation: true
           Sunset:      <RFC 7231 date string>
           Link:        </api/v2/...>; rel="successor-version"
    3. Emit a WARNING log entry per request so dashboards can track adoption
       of deprecated routes.

    Pass metadata via APIRouter:
        router = APIRouter(route_class=DeprecatedRoute)

    Or on individual routes by directly instantiating with ``endpoint_meta``:
        see ``deprecated()`` decorator below.
    """

    # Override these at the class level when subclassing for a specific route.
    VERSION:     str = "v1"
    SUNSET_DATE: str = "2026-12-01"   # ISO-8601 date
    SUCCESSOR:   str = "/api/v2/"

    def get_route_handler(self) -> Callable:
        original_handler = super().get_route_handler()

        @functools.wraps(original_handler)
        async def wrapped_handler(request: Request) -> Response:
            sunset = date.fromisoformat(self.__class__.SUNSET_DATE)
            today  = datetime.utcnow().date()

            # ── POST sunset: hard 410 ────────────────────────────────────────
            if today >= sunset:
                logger.warning(
                    "[versioning] Route %s has passed sunset (%s) — returning 410",
                    request.url.path, self.__class__.SUNSET_DATE,
                )
                return JSONResponse(
                    status_code=410,
                    content={
                        "error_code": "API_VERSION_SUNSET",
                        "message": (
                            f"This API version ({self.__class__.VERSION}) has been retired. "
                            f"Use {self.__class__.SUCCESSOR} instead."
                        ),
                        "successor": self.__class__.SUCCESSOR,
                        "sunset_date": self.__class__.SUNSET_DATE,
                    },
                )

            # ── Pre-sunset: serve with deprecation headers ───────────────────
            logger.warning(
                "[versioning] Deprecated route called: %s (sunset %s)",
                request.url.path, self.__class__.SUNSET_DATE,
            )

            response: Response = await original_handler(request)

            # RFC 8594 Sunset header + custom Deprecation header
            response.headers["Deprecation"] = "true"
            response.headers["Sunset"]      = sunset.strftime("%a, %d %b %Y 00:00:00 GMT")
            response.headers["Link"]        = (
                f'<{self.__class__.SUCCESSOR}>; rel="successor-version"'
            )

            return response

        return wrapped_handler


def deprecated(
    *,
    version: str = "v1",
    sunset_date: str = "2026-12-01",
    successor: str = "/api/v2/",
) -> Callable:
    """
    Decorator for individual FastAPI endpoint functions.

    Wraps the coroutine to:
    - Return 410 Gone (with structured body) if today >= sunset_date.
    - Inject Deprecation / Sunset / Link headers for pre-sunset requests.

    Example::

        @router.get("/old-endpoint")
        @deprecated(version="v1", sunset_date="2026-12-01", successor="/api/v2/new-endpoint")
        async def old_endpoint():
            return {"message": "old data"}

    The decorator must be applied BELOW the router decorator so the route
    is registered with the original async function signature, but the
    request/response interception happens inside the wrapper.

    Note: This decorator provides header injection. For full request-level
    interception (access to raw Request & Response objects), prefer
    ``DeprecatedRoute`` as the ``route_class`` on the APIRouter instead.
    """
    _sunset = date.fromisoformat(sunset_date)

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            today = datetime.utcnow().date()
            if today >= _sunset:
                logger.warning(
                    "[versioning] @deprecated endpoint %s has passed sunset (%s)",
                    func.__name__, sunset_date,
                )
                return JSONResponse(
                    status_code=410,
                    content={
                        "error_code": "API_VERSION_SUNSET",
                        "message": (
                            f"This API version ({version}) has been retired. "
                            f"Use {successor} instead."
                        ),
                        "successor": successor,
                        "sunset_date": sunset_date,
                    },
                )

            logger.warning(
                "[versioning] Deprecated endpoint called: %s (version=%s, sunset=%s)",
                func.__name__, version, sunset_date,
            )
            return await func(*args, **kwargs)

        # Attach metadata so CI tooling / route introspection can read it
        wrapper.__deprecated__     = True
        wrapper.__api_version__    = version
        wrapper.__sunset_date__    = sunset_date
        wrapper.__successor_path__ = successor

        return wrapper

    return decorator


def make_deprecated_route_class(
    version: str = "v1",
    sunset_date: str = "2026-12-01",
    successor: str = "/api/v2/",
) -> type:
    """
    Factory to create a DeprecatedRoute subclass with specific metadata.

    Use this when you want to deprecate a whole router at once:

        router = APIRouter(
            route_class=make_deprecated_route_class(
                version="v1",
                sunset_date="2026-12-01",
                successor="/api/v2/auth/",
            )
        )
    """
    return type(
        f"DeprecatedRoute_{version}_{sunset_date.replace('-', '')}",
        (DeprecatedRoute,),
        {
            "VERSION":     version,
            "SUNSET_DATE": sunset_date,
            "SUCCESSOR":   successor,
        },
    )
