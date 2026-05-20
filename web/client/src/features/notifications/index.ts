import { apiGet, apiPatch } from "@/lib/http";
import { useAsync } from "@/features/_shared/useAsync";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body?: string | null;
  read_at?: string | null;
  created_at: string;
}

export const notificationsService = {
  list: (limit = 30) => apiGet<{ items: Notification[] }>(`/me/notifications?limit=${limit}`),
  markRead: (id: string) => apiPatch<void>(`/me/notifications/${id}/read`),
};

export function useNotifications(limit = 30) {
  const { user } = useAuth();
  return useAsync(
    () => (user ? notificationsService.list(limit).then((r) => r.items) : Promise.resolve([])),
    [user?.id, limit],
    [],
  );
}
