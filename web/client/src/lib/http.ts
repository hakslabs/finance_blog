/**
 * HTTP client for the FastAPI backend.
 *
 * Vercel rewrites `/api/(.*)` → `api/index.py`. Locally, vite proxies
 * `/api` → `http://127.0.0.1:8000`. All paths here are prefixed with
 * `/api/v1`.
 *
 * Auth: backend reads `Authorization: Bearer <supabase-jwt>`. The token
 * is read from localStorage (kept in sync by AuthContext). On 401 we try
 * one Supabase session refresh, then retry once before throwing.
 */
import { supabase, supabaseEnabled } from "@/lib/supabase";

const API_PREFIX = "/api/v1";
const JWT_KEY = "supabase_jwt";

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
    typeof window !== "undefined" ? localStorage.getItem(JWT_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function refreshToken(): Promise<boolean> {
  if (!supabaseEnabled || !supabase) return false;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) return false;
  localStorage.setItem(JWT_KEY, data.session.access_token);
  return true;
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const doFetch = () =>
    fetch(`${API_PREFIX}${path}`, {
      ...init,
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
        ...(init?.headers ?? {}),
      },
      body: body === undefined ? init?.body : JSON.stringify(body),
    });

  let res = await doFetch();
  if (res.status === 401 && (await refreshToken())) {
    res = await doFetch();
  }

  if (!res.ok) {
    let code: string | undefined;
    let message: string | undefined;
    try {
      const errBody = await res.json();
      code = errBody?.error?.code ?? errBody?.detail;
      message = errBody?.error?.message ?? errBody?.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(
      res.status,
      message ?? `${method} ${path} failed: ${res.status}`,
      code,
    );
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>("GET", path, undefined, init);
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  return request<T>("POST", path, body, init);
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  return request<T>("PATCH", path, body, init);
}

export function apiPut<T>(
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  return request<T>("PUT", path, body, init);
}

export function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>("DELETE", path, undefined, init);
}
