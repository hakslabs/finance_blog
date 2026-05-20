import { apiGet, apiPatch } from "@/lib/http";

export interface UserPreferences {
  last_market?: "US" | "KR" | null;
  preferred_indicators?: string[] | null;
  preferred_timeframe?: string | null;
  dismissed_notice_ids?: string[] | null;
  macro_overrides?: Record<string, unknown> | null;
}

export const preferencesService = {
  get: () => apiGet<UserPreferences>(`/me/preferences`),
  patch: (body: Partial<UserPreferences>) => apiPatch<UserPreferences>(`/me/preferences`, body),
};
