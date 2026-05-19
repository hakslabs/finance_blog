/**
 * HTTP client for the FastAPI backend.
 *
 * Vercel rewrites `/api/(.*)` → `api/index.py`. Locally, vite proxies
 * `/api` → `http://127.0.0.1:8000`. All paths here are prefixed with
 * `/api/v1`.
 *
 * Auth: backend reads `Authorization: Bearer <supabase-jwt>`. The token
 * is read from localStorage. While Supabase auth is not yet wired into
 * the frontend, authenticated endpoints will return 401.
 */

const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function authHeader(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("supabase_jwt")
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let code: string | undefined;
    try {
      const body = await res.json();
      code = body?.error?.code ?? body?.detail;
    } catch {}
    throw new ApiError(res.status, `GET ${path} failed: ${res.status}`, code);
  }
  return res.json() as Promise<T>;
}
