// In production we serve the FastAPI through `/api` on the same Vercel
// project (see vercel.json routes). In dev (vite dev) we hit the local
// FastAPI on :8000 unless overridden via VITE_API_BASE_URL.
const defaultApiBase = import.meta.env.PROD ? "/api" : "http://localhost:8000";

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? defaultApiBase,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  adminEmails: import.meta.env.VITE_ADMIN_EMAILS as string | undefined,
};

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export const hasSupabaseBrowserConfig = Boolean(
  isHttpUrl(env.supabaseUrl) && env.supabaseAnonKey,
);
