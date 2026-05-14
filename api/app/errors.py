from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.models.errors import ErrorBody, ErrorResponse


_STATUS_CODE_MAP = {
    400: "bad_request",
    401: "unauthenticated",
    403: "forbidden",
    404: "not_found",
    429: "rate_limited",
    503: "upstream_unavailable",
}


def _json(status_code: int, code: str, message: str, details: object = None) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorBody(code=code, message=message, details=details if isinstance(details, dict) else None)
    )
    return JSONResponse(status_code=status_code, content=body.model_dump(exclude_none=True))


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _json(
            status_code=400,
            code="bad_request",
            message="Request validation failed.",
            details={"errors": exc.errors()},
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _STATUS_CODE_MAP.get(exc.status_code, "error")
        message = exc.detail if isinstance(exc.detail, str) else code
        details = exc.detail if isinstance(exc.detail, dict) else None
        return _json(status_code=exc.status_code, code=code, message=message, details=details)
