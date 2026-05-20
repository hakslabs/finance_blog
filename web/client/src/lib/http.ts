/**
 * HTTP client for FinanceLab Pro backend.
 *
 * Base URL: /api/v1 (vite proxies → FastAPI). Override with VITE_API_BASE.
 * Auth: reads Supabase JWT from localStorage; one-shot refresh-retry on 401.
 */
import { supabase, supabaseEnabled } from "@/lib/supabase";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1";
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
    fetch(`${API_BASE}${path}`, {
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

export const apiGet = <T>(p: string, init?: RequestInit) =>
  request<T>("GET", p, undefined, init);
export const apiPost = <T>(p: string, body?: unknown, init?: RequestInit) =>
  request<T>("POST", p, body, init);
export const apiPatch = <T>(p: string, body?: unknown, init?: RequestInit) =>
  request<T>("PATCH", p, body, init);
export const apiPut = <T>(p: string, body?: unknown, init?: RequestInit) =>
  request<T>("PUT", p, body, init);
export const apiDelete = <T>(p: string, init?: RequestInit) =>
  request<T>("DELETE", p, undefined, init);
