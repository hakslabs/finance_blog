"""Per-user memos (polymorphic, owner-RLS).

Backed by `user_memos` (mig 0024). Covers:
- StockDetail journal (target_kind=stock, target_ref=ticker)
- Calendar memo (target_kind=calendar_event, target_ref=event_id)
- Master notes (target_kind=master, target_ref=master_id)
- Report notes (target_kind=report, target_ref=report_id)
- Free-form journal (target_kind=free)

`linked_trade_ids[]` connects journal entries to specific trades.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/memos", tags=["memos"])
bearer = HTTPBearer(auto_error=False)

VALID_KINDS = {"stock", "master", "report", "calendar_event", "sector", "free"}


class Memo(BaseModel):
    id: str
    target_kind: str
    target_ref: Optional[str] = None
    title: Optional[str] = None
    body: str
    linked_trade_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MemosResponse(BaseModel):
    items: List[Memo]


class MemoCreate(BaseModel):
    target_kind: str = Field(..., min_length=1)
    target_ref: Optional[str] = None
    title: Optional[str] = None
    body: str = Field(..., min_length=1)
    linked_trade_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class MemoUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    linked_trade_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = None


def _require_bearer(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(401, "unauthenticated")
    return creds.credentials


def _user_headers(token: str, settings: Settings) -> Dict[str, str]:
    if not settings.supabase_url:
        raise HTTPException(503, "upstream_unavailable")
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


@router.get("", response_model=MemosResponse)
async def list_memos(
    target_kind: Optional[str] = Query(None),
    target_ref: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> MemosResponse:
    if target_kind and target_kind not in VALID_KINDS:
        raise HTTPException(400, "invalid_kind")
    params: Dict[str, str] = {
        "select": "id,target_kind,target_ref,title,body,linked_trade_ids,tags,created_at,updated_at",
        "order": "created_at.desc",
        "limit": str(limit),
    }
    if target_kind:
        params["target_kind"] = f"eq.{target_kind}"
    if target_ref:
        params["target_ref"] = f"eq.{target_ref}"
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as c:
        r = await c.get(f"{base}/rest/v1/user_memos", params=params)
        if r.status_code >= 400:
            return MemosResponse(items=[])
    return MemosResponse(items=[Memo(**row) for row in r.json()])


@router.post("", response_model=Memo, status_code=201)
async def create_memo(
    body: MemoCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Memo:
    if body.target_kind not in VALID_KINDS:
        raise HTTPException(400, "invalid_kind")
    base = settings.supabase_url.rstrip("/")
    payload: Dict[str, Any] = body.model_dump(exclude_none=True)
    headers = {**_user_headers(token, settings),
               "Content-Type": "application/json",
               "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.post(f"{base}/rest/v1/user_memos", json=payload)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
        rows = r.json()
    return Memo(**rows[0])


@router.patch("/{memo_id}", response_model=Memo)
async def update_memo(
    body: MemoUpdate,
    memo_id: str = Path(...),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Memo:
    base = settings.supabase_url.rstrip("/")
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(400, "nothing_to_update")
    headers = {**_user_headers(token, settings),
               "Content-Type": "application/json",
               "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.patch(f"{base}/rest/v1/user_memos",
                          params={"id": f"eq.{memo_id}"},
                          json=payload)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
        rows = r.json()
    if not rows:
        raise HTTPException(404, "memo_not_found")
    return Memo(**rows[0])


@router.delete("/{memo_id}", status_code=204)
async def delete_memo(
    memo_id: str = Path(...),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> None:
    base = settings.supabase_url.rstrip("/")
    headers = {**_user_headers(token, settings), "Prefer": "return=minimal"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.delete(f"{base}/rest/v1/user_memos", params={"id": f"eq.{memo_id}"})
        if r.status_code >= 400 and r.status_code != 404:
            raise HTTPException(r.status_code, r.text[:200])
