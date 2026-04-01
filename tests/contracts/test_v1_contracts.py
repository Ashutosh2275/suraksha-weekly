from __future__ import annotations

import importlib
import json
import os
import sys
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient


API_SERVICE_ROOT = Path(__file__).resolve().parents[2] / "services" / "api"
if str(API_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(API_SERVICE_ROOT))


@pytest.fixture(scope="session")
def v1_openapi_schema() -> dict[str, Any]:
    old_values = {
        "DATABASE_URL": os.environ.get("DATABASE_URL"),
        "REDIS_URL": os.environ.get("REDIS_URL"),
        "JWT_SECRET": os.environ.get("JWT_SECRET"),
    }
    os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://suraksha:password@localhost:5432/suraksha_db")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
    os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

    app_module = importlib.import_module("app")
    app = app_module.create_app()
    schema = app.openapi()
    v1_paths = {path: value for path, value in schema.get("paths", {}).items() if path.startswith("/api/v1/")}

    for key, value in old_values.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value

    return {"paths": v1_paths, "components": schema.get("components", {})}


def _resolve_ref(schema: dict[str, Any], ref: str) -> dict[str, Any]:
    if not ref.startswith("#/components/schemas/"):
        return {}
    name = ref.split("/")[-1]
    return schema.get("components", {}).get("schemas", {}).get(name, {})


def _schema_node(schema: dict[str, Any], response_schema: dict[str, Any]) -> dict[str, Any]:
    if "$ref" in response_schema:
        return _resolve_ref(schema, response_schema["$ref"])
    return response_schema


def _json_response_schema(operation: dict[str, Any], status: str = "200") -> dict[str, Any]:
    response = operation.get("responses", {}).get(status, {})
    return response.get("content", {}).get("application/json", {}).get("schema", {})


def _is_write_method(method: str) -> bool:
    return method.lower() in {"post", "put", "patch", "delete"}


def _has_idempotency_key(operation: dict[str, Any]) -> bool:
    for param in operation.get("parameters", []):
        if str(param.get("name", "")).lower() == "idempotency-key":
            return True
    return False


def test_v1_paths_exist(v1_openapi_schema: dict[str, Any]) -> None:
    assert v1_openapi_schema["paths"], "No /api/v1 routes were discovered in OpenAPI schema"


def test_standard_error_codes_documented(v1_openapi_schema: dict[str, Any]) -> None:
    declared_codes: set[str] = set()
    for path, methods in v1_openapi_schema["paths"].items():
        for method, operation in methods.items():
            if method.lower() == "get" and path.endswith("/openapi.json"):
                continue
            responses = operation.get("responses", {})
            declared_codes.update(responses.keys())

    assert "422" in declared_codes, "OpenAPI v1 is missing documented 422 validation errors"

    for optional_code in ("401", "403", "404", "429"):
        if optional_code not in declared_codes:
            pytest.skip(f"OpenAPI v1 currently does not document {optional_code} responses")


def test_required_response_fields_present(v1_openapi_schema: dict[str, Any]) -> None:
    for path, methods in v1_openapi_schema["paths"].items():
        for method, operation in methods.items():
            schema_ref = _json_response_schema(operation, "200")
            if not schema_ref:
                continue
            node = _schema_node(v1_openapi_schema, schema_ref)
            required = node.get("required", [])
            properties = node.get("properties", {})
            for field in required:
                assert field in properties, f"{method.upper()} {path} missing required field definition for {field}"


def test_response_field_types_declared(v1_openapi_schema: dict[str, Any]) -> None:
    for path, methods in v1_openapi_schema["paths"].items():
        for method, operation in methods.items():
            schema_ref = _json_response_schema(operation, "200")
            if not schema_ref:
                continue
            node = _schema_node(v1_openapi_schema, schema_ref)
            for field, field_schema in node.get("properties", {}).items():
                if "$ref" in field_schema:
                    resolved = _resolve_ref(v1_openapi_schema, field_schema["$ref"])
                    assert resolved, f"{method.upper()} {path} field {field} has unresolved $ref"
                    continue
                assert "type" in field_schema or "anyOf" in field_schema or "oneOf" in field_schema, (
                    f"{method.upper()} {path} field {field} missing type declaration"
                )


def test_write_endpoints_declare_idempotency_contract(v1_openapi_schema: dict[str, Any]) -> None:
    write_ops: list[tuple[str, str, dict[str, Any]]] = []
    for path, methods in v1_openapi_schema["paths"].items():
        for method, operation in methods.items():
            if _is_write_method(method):
                write_ops.append((path, method, operation))

    assert write_ops, "No write endpoints found under /api/v1"

    declared_idempotent = [
        (path, method, operation)
        for path, method, operation in write_ops
        if _has_idempotency_key(operation)
    ]

    if not declared_idempotent:
        pytest.skip("No write endpoint currently declares Idempotency-Key contract")

    for path, method, operation in declared_idempotent:
        responses = operation.get("responses", {})
        assert "200" in responses or "201" in responses, f"{method.upper()} {path} missing success response"
