import { apiGet, apiPatch } from "@/lib/http";

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  items: Notification[];
  unread_count: number;
}

export const notificationsService = {
  list: (limit = 50) =>
    apiGet<NotificationsResponse>(`/me/notifications?limit=${limit}`),
  markRead: (id: string) =>
    apiPatch<Notification>(`/me/notifications/${encodeURIComponent(id)}/read`, {}),
  markAllRead: () => apiPatch<{ marked_read: boolean }>("/me/notifications/read-all", {}),
};
