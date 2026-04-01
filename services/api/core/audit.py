"""Immutable audit logging for state transitions."""

from __future__ import annotations

import asyncio
import json
import sys
from copy import deepcopy
from datetime import date, datetime
from decimal import Decimal
from functools import wraps
from inspect import isawaitable
from typing import Any, Callable, Optional

from prometheus_client import Counter
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import DatabaseManager
from models import AuditLog


audit_log_failures_total = Counter(
    "audit_log_failures_total",
    "Number of failed immutable audit log inserts",
)


class AuditLogMutationError(RuntimeError):
    """Raised when code attempts to update or delete an AuditLog row."""


def _json_default(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if hasattr(value, "dict"):
        return value.dict()
    return str(value)


def _serialize_state(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date, Decimal)):
        return _json_default(value)
    if isinstance(value, dict):
        return {key: _serialize_state(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_serialize_state(item) for item in value]
    if hasattr(value, "__table__"):
        data: dict[str, Any] = {}
        for column in value.__table__.columns:
            data[column.name] = _serialize_state(getattr(value, column.name, None))
        return data
    if hasattr(value, "model_dump"):
        return _serialize_state(value.model_dump())
    if hasattr(value, "dict"):
        return _serialize_state(value.dict())
    if hasattr(value, "__dict__"):
        data = {
            key: _serialize_state(item)
            for key, item in value.__dict__.items()
            if not key.startswith("_")
        }
        return data
    return _json_default(value)


def _first_useful_value(*values: Any) -> Any:
    for value in values:
        if value is not None:
            return value
    return None


def _extract_entity_id(state: Any) -> Optional[str]:
    if isinstance(state, dict):
        entity_id = state.get("id")
        return str(entity_id) if entity_id is not None else None
    entity_id = getattr(state, "id", None)
    return str(entity_id) if entity_id is not None else None


def _guess_target_state(args: tuple[Any, ...], kwargs: dict[str, Any]) -> Any:
    for key in ("entity", "state", "obj", "model", "policy", "claim", "payout", "fraud_assessment"):
        if key in kwargs and kwargs[key] is not None:
            return kwargs[key]
    if args:
        first = args[0]
        if first is not None and not isinstance(first, (str, int, float, bool, bytes)):
            return first
    return None


async def _insert_audit_row(
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: Optional[str],
    actor_role: Optional[str],
    previous_state: Any,
    new_state: Any,
    metadata: Any,
) -> None:
    if DatabaseManager._session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    stmt = text(
        "INSERT INTO audit_logs "
        "(id, entity_type, entity_id, action, actor_role, actor_id, previous_state, new_state, metadata, created_at) "
        "VALUES (:id, :entity_type, :entity_id, :action, :actor_role, :actor_id, "
        "CAST(:previous_state AS JSON), CAST(:new_state AS JSON), CAST(:metadata AS JSON), :created_at)"
    )

    previous_state_json = json.dumps(_serialize_state(previous_state), default=_json_default)
    new_state_json = json.dumps(_serialize_state(new_state), default=_json_default)
    metadata_json = json.dumps(_serialize_state(metadata), default=_json_default)

    async with DatabaseManager._session_factory() as session:
        await session.execute(
            stmt,
            {
                "id": str(__import__("uuid").uuid4()),
                "entity_type": entity_type,
                "entity_id": entity_id,
                "action": action,
                "actor_role": actor_role or "system",
                "actor_id": actor_id,
                "previous_state": previous_state_json,
                "new_state": new_state_json,
                "metadata": metadata_json,
                "created_at": datetime.utcnow(),
            },
        )
        await session.commit()


async def log_event(
    entity_type: str,
    entity_id: str,
    action: str,
    actor_id: Optional[str],
    actor_role: Optional[str],
    previous_state: Any,
    new_state: Any,
    metadata: Any,
) -> None:
    """Insert an immutable audit log row."""

    try:
        await _insert_audit_row(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            actor_role=actor_role,
            previous_state=previous_state,
            new_state=new_state,
            metadata=metadata,
        )
    except Exception as exc:  # pragma: no cover - exercised via failure test path
        print(f"[audit] failed to insert audit row for {entity_type}:{entity_id} -> {exc}", file=sys.stderr)
        audit_log_failures_total.inc()


def audit_logged(entity_type: str, action_name: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Wrap an async service function and log its state transition."""

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            target_state = _guess_target_state(args, kwargs)
            previous_state = deepcopy(_serialize_state(target_state))
            entity_id = _extract_entity_id(previous_state)

            try:
                result = await func(*args, **kwargs)
            except Exception as exc:
                failed_metadata = {
                    "status": "failed_attempt",
                    "wrapped_action": action_name,
                    "exception_type": type(exc).__name__,
                    "exception": str(exc),
                }
                failed_entity_id = entity_id or _extract_entity_id(target_state) or "unknown"
                asyncio.create_task(
                    log_event(
                        entity_type=entity_type,
                        entity_id=failed_entity_id,
                        action="failed_attempt",
                        actor_id=_first_useful_value(
                            kwargs.get("actor_id"),
                            getattr(target_state, "actor_id", None),
                        ),
                        actor_role=_first_useful_value(
                            kwargs.get("actor_role"),
                            getattr(target_state, "actor_role", None),
                            "system",
                        ),
                        previous_state=previous_state,
                        new_state=None,
                        metadata=failed_metadata,
                    )
                )
                raise

            new_state_source = _first_useful_value(result, target_state)
            new_state = _serialize_state(new_state_source)
            resolved_entity_id = entity_id or _extract_entity_id(new_state) or "unknown"

            metadata = {
                "wrapped_action": action_name,
                "function": func.__name__,
            }
            asyncio.create_task(
                log_event(
                    entity_type=entity_type,
                    entity_id=resolved_entity_id,
                    action=action_name,
                    actor_id=_first_useful_value(
                        kwargs.get("actor_id"),
                        getattr(target_state, "actor_id", None),
                        getattr(result, "actor_id", None),
                    ),
                    actor_role=_first_useful_value(
                        kwargs.get("actor_role"),
                        getattr(target_state, "actor_role", None),
                        getattr(result, "actor_role", None),
                        "system",
                    ),
                    previous_state=previous_state,
                    new_state=new_state,
                    metadata=metadata,
                )
            )
            return result

        return wrapper

    return decorator


def _raise_immutable_audit_log(*_: Any) -> None:
    raise AuditLogMutationError("AuditLog is immutable. UPDATE and DELETE operations are not permitted.")


event.listen(AuditLog, "before_delete", _raise_immutable_audit_log, propagate=True)
event.listen(AuditLog, "before_update", _raise_immutable_audit_log, propagate=True)
