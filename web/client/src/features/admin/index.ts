import { apiGet, apiPost, apiPatch } from "@/lib/http";

export interface AdminUser {
  id: string;
  email?: string;
  display_name: string;
  role: "user" | "admin" | "superadmin";
  plan?: string | null;
  created_at?: string;
}

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  audience: "all" | "free" | "premium";
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export const adminService = {
  users: () => apiGet<{ items: AdminUser[] }>(`/admin/users`),
  updateUser: (id: string, role: "user" | "admin" | "superadmin") =>
    apiPatch<AdminUser>(`/admin/users/${id}`, { role }),
  broadcasts: () => apiGet<{ items: Broadcast[] }>(`/admin/broadcasts`),
  createBroadcast: (
    body: Pick<Broadcast, "title" | "body" | "audience"> & {
      scheduled_at?: string;
    },
  ) => apiPost<Broadcast>(`/admin/broadcasts`, body),
};
