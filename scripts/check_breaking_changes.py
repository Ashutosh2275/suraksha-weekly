from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import requests


BASE_URL = "http://localhost:8000"
CURRENT_SCHEMA_ENDPOINT = "/api/v1/openapi.json"
BASELINE_SCHEMA_PATH = Path("docs/api_schema_v1.json")


def _fetch_current_schema() -> dict[str, Any]:
    url = f"{BASE_URL.rstrip('/')}{CURRENT_SCHEMA_ENDPOINT}"
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.json()


def _load_baseline_schema() -> dict[str, Any]:
    if not BASELINE_SCHEMA_PATH.exists():
        raise FileNotFoundError(
            f"Baseline schema not found at {BASELINE_SCHEMA_PATH}. Generate and commit it before running this check."
        )
    return json.loads(BASELINE_SCHEMA_PATH.read_text(encoding="utf-8"))


def _resolve_ref(schema: dict[str, Any], ref: str) -> dict[str, Any]:
    if not ref.startswith("#/components/schemas/"):
        return {}
    name = ref.split("/")[-1]
    return schema.get("components", {}).get("schemas", {}).get(name, {})


def _extract_properties(schema: dict[str, Any], node: dict[str, Any]) -> tuple[dict[str, Any], set[str]]:
    if "$ref" in node:
        node = _resolve_ref(schema, node["$ref"])

    if not isinstance(node, dict):
        return {}, set()

    properties = node.get("properties") or {}
    required = set(node.get("required") or [])
    return properties, required


def _type_signature(schema: dict[str, Any], node: dict[str, Any]) -> str:
    if "$ref" in node:
        resolved = _resolve_ref(schema, node["$ref"])
        return f"ref:{node['$ref']}|{_type_signature(schema, resolved)}"
    parts = [
        f"type:{node.get('type')}",
        f"format:{node.get('format')}",
    ]
    if node.get("type") == "array" and isinstance(node.get("items"), dict):
        parts.append(f"items:{_type_signature(schema, node['items'])}")
    return "|".join(parts)


def _compare_path_methods(
    baseline: dict[str, Any],
    current: dict[str, Any],
    errors: list[str],
) -> None:
    baseline_paths = baseline.get("paths", {})
    current_paths = current.get("paths", {})

    for path, methods in baseline_paths.items():
        if path not in current_paths:
            errors.append(f"Removed endpoint path: {path}")
            continue

        for method, operation in methods.items():
            if method not in current_paths[path]:
                errors.append(f"Removed endpoint method: {method.upper()} {path}")
                continue

            baseline_responses = operation.get("responses", {})
            current_responses = current_paths[path][method].get("responses", {})
            if "200" in baseline_responses and "200" in current_responses:
                _compare_success_response(
                    baseline,
                    current,
                    path,
                    method,
                    baseline_responses["200"],
                    current_responses["200"],
                    errors,
                )


def _response_schema(response: dict[str, Any]) -> dict[str, Any]:
    content = response.get("content", {})
    app_json = content.get("application/json", {})
    return app_json.get("schema", {}) if isinstance(app_json, dict) else {}


def _compare_success_response(
    baseline: dict[str, Any],
    current: dict[str, Any],
    path: str,
    method: str,
    baseline_response: dict[str, Any],
    current_response: dict[str, Any],
    errors: list[str],
) -> None:
    baseline_schema = _response_schema(baseline_response)
    current_schema = _response_schema(current_response)

    baseline_props, baseline_required = _extract_properties(baseline, baseline_schema)
    current_props, current_required = _extract_properties(current, current_schema)

    for field in sorted(baseline_required):
        if field not in current_required:
            errors.append(f"Required field removed: {method.upper()} {path} -> {field}")

    for field, baseline_field_schema in baseline_props.items():
        if field not in current_props:
            errors.append(f"Response field removed: {method.upper()} {path} -> {field}")
            continue

        baseline_sig = _type_signature(baseline, baseline_field_schema)
        current_sig = _type_signature(current, current_props[field])
        if baseline_sig != current_sig:
            errors.append(
                "Type changed: "
                f"{method.upper()} {path} -> {field} ({baseline_sig} -> {current_sig})"
            )


def main() -> int:
    try:
        baseline = _load_baseline_schema()
        current = _fetch_current_schema()
    except Exception as exc:
        print(f"Failed to load schemas: {exc}")
        return 1

    errors: list[str] = []
    _compare_path_methods(baseline, current, errors)

    if errors:
        print("Breaking changes detected:")
        for issue in errors:
            print(f" - {issue}")
        return 1

    print("No breaking changes detected for v1 contract.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
