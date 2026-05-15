# Multi-stage build for the Finance_lab FastAPI service.
# Stage 1 resolves dependencies via uv into a system-installed venv.
# Stage 2 carries only the runtime artefacts.

FROM python:3.13-slim AS builder

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv

COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /uvx /usr/local/bin/

WORKDIR /app

# Cache the dependency layer separately from the source so code-only
# changes don't reinstall packages.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app
RUN uv sync --frozen --no-dev

FROM python:3.13-slim AS runtime

ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=prod \
    PORT=8080

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app/app /app/app

# Default to gunicorn-like behaviour with uvicorn worker; Fly forwards
# to the internal port declared in fly.toml.
EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
