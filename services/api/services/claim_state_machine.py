"""Claim state transition rules and audited transition executor."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from core.audit import log_event


VALID_TRANSITIONS: dict[str, set[str]] = {
    "INITIATED": {"IN_REVIEW", "APPROVED"},
    "IN_REVIEW": {"APPROVED", "REJECTED"},
    "APPROVED": {"PAID"},
    "REJECTED": set(),
    "PAID": set(),
}


def _normalize_state(value: str | None) -> str:
    return (value or "").strip().upper()


@dataclass
class ClaimStateMachineError(Exception):
    """Domain error raised when an invalid claim transition is requested."""

    message: str
    error_code: str = "INVALID_STATE_TRANSITION"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.message


class ClaimStateMachine:
    """Apply audited claim status transitions with strict transition map."""

    async def transition(
        self,
        claim: Any,
        to_state: str,
        *,
        actor_role: str,
        actor_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        from_state = _normalize_state(getattr(claim, "status", None))
        target_state = _normalize_state(to_state)
        extra = metadata or {}

        is_valid = self._is_valid_transition(from_state, target_state)
        if not is_valid:
            await log_event(
                entity_type="Claim",
                entity_id=str(getattr(claim, "id", "unknown")),
                action="invalid_state_transition",
                actor_id=actor_id,
                actor_role=actor_role,
                previous_state={"status": from_state},
                new_state={"status": target_state},
                metadata={
                    "error_code": "INVALID_STATE_TRANSITION",
                    "attempted_from": from_state,
                    "attempted_to": target_state,
                    **extra,
                },
            )
            raise ClaimStateMachineError(
                message=f"Invalid claim transition attempted: {from_state} -> {target_state}",
            )

        setattr(claim, "status", target_state)
        if hasattr(claim, "updated_at"):
            setattr(claim, "updated_at", datetime.utcnow())

        await log_event(
            entity_type="Claim",
            entity_id=str(getattr(claim, "id", "unknown")),
            action="state_transition",
            actor_id=actor_id,
            actor_role=actor_role,
            previous_state={"status": from_state},
            new_state={"status": target_state},
            metadata={
                "from": from_state,
                "to": target_state,
                **extra,
            },
        )
        return claim

    def _is_valid_transition(self, from_state: str, to_state: str) -> bool:
        if to_state == "REJECTED":
            return True
        return to_state in VALID_TRANSITIONS.get(from_state, set())
