"""Authentication dependencies.

PR-09 uses the interim dev-header contract from `docs/design-docs/auth.md`:
the request must include `X-Dev-User: <uuid>` and the API must be running with
`APP_ENV=local`. JWT-based auth replaces this in PR-14.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, Header, HTTPException

from app.settings import Settings, get_settings


def get_current_user_id(
    x_dev_user: str | None = Header(default=None, alias="X-Dev-User"),
    settings: Settings = Depends(get_settings),
) -> UUID:
    if settings.app_env != "local":
        raise HTTPException(status_code=401, detail="unauthenticated")
    if not x_dev_user:
        raise HTTPException(status_code=401, detail="unauthenticated")
    try:
        return UUID(x_dev_user)
    except ValueError:
        raise HTTPException(status_code=401, detail="unauthenticated")
