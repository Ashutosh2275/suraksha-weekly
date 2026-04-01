# FastAPI Common Utilities

Shared utilities for FastAPI services in the Suraksha Weekly monorepo.

## Features

- **Config Validation**: Validate environment variables at startup with descriptive error messages
- **Correlation ID Middleware**: Automatic request tracing with UUID generation
- **Centralized Error Models**: Standardized error responses across all services

## Usage

### Config Validation

```python
from shared.fastapi_common.config import create_config_validator

# At service startup
validator = create_config_validator("My Service")
config = (
    validator
    .add_required("DATABASE_URL", "PostgreSQL connection string")
    .add_required("API_KEY", "External API key for service")
    .add_optional("LOG_LEVEL", "Logging level", default="INFO")
    .validate()
)

print(validator.get_config_summary(config))
```

### Correlation ID Middleware

```python
from fastapi import FastAPI
from shared.fastapi_common.middleware import CorrelationIdMiddleware, get_correlation_id

app = FastAPI()
app.add_middleware(CorrelationIdMiddleware)

@app.get("/")
async def root():
    correlation_id = get_correlation_id()
    return {"message": "Hello", "correlation_id": correlation_id}
```

### Error Handling

```python
from fastapi import FastAPI
from shared.fastapi_common.errors import (
    ServiceException,
    NotFoundException,
    ValidationException,
    service_exception_handler,
    generic_exception_handler,
    create_success_response
)
from shared.fastapi_common.middleware import get_correlation_id

app = FastAPI()
app.add_exception_handler(ServiceException, service_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

@app.get("/items/{item_id}")
async def get_item(item_id: str):
    item = find_item(item_id)
    if not item:
        raise NotFoundException("Item", item_id)
    
    return create_success_response(
        data=item,
        correlation_id=get_correlation_id()
    )
```

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error_code": "NOT_FOUND",
  "message": "Item with id '123' not found",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```
