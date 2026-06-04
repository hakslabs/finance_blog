#!/usr/bin/env bash
# One-command local dev runner for Finance_lab.
#
# Boots the FastAPI backend and the Vite/React frontend together, wires the
# frontend dev proxy to whichever port the API actually binds, and tears both
# down on Ctrl+C. Pick a free API port automatically so a busy :8000 (e.g. an
# unrelated local Docker service) does not block startup.
#
# Usage:
#   ./scripts/dev.sh              # API on first free port (8000→8010→8020…), web on :3000
#   API_PORT=8010 ./scripts/dev.sh
#   WEB_PORT=5173 ./scripts/dev.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WEB_PORT="${WEB_PORT:-3000}"

# --- env guard ---------------------------------------------------------------
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    echo "→ .env가 없어 .env.example을 복사합니다. API 키를 채워 넣으세요."
    cp .env.example .env
  else
    echo "✗ .env / .env.example 둘 다 없습니다." >&2
    exit 1
  fi
fi

# --- pick a free API port ----------------------------------------------------
port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
if [[ -n "${API_PORT:-}" ]]; then
  :
else
  API_PORT=8000
  for candidate in 8000 8010 8020 8030; do
    if ! port_busy "$candidate"; then API_PORT="$candidate"; break; fi
  done
fi
if port_busy "$API_PORT"; then
  echo "✗ API_PORT=$API_PORT 이 이미 사용 중입니다. 다른 포트를 지정하세요." >&2
  exit 1
fi

echo "→ API   : http://127.0.0.1:${API_PORT}  (FastAPI / uvicorn)"
echo "→ Web   : http://127.0.0.1:${WEB_PORT}  (Vite, /api → :${API_PORT})"
echo "→ 종료  : Ctrl+C"
echo

# --- launch + cleanup --------------------------------------------------------
PIDS=()
cleanup() {
  echo; echo "→ 서버를 종료합니다…"
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

( cd api && exec uv run uvicorn app.main:app --host 127.0.0.1 --port "$API_PORT" ) &
PIDS+=($!)

( cd web && VITE_PROXY_TARGET="http://127.0.0.1:${API_PORT}" exec npx vite --port "$WEB_PORT" --host 127.0.0.1 ) &
PIDS+=($!)

# Wait on either process; if one dies, cleanup() fires via EXIT trap.
wait -n
