import { apiGet, apiPost, apiDelete } from "@/lib/http";

export interface FollowItem {
  master_id: string;
  created_at?: string;
}

export const followsService = {
  listMasters: () => apiGet<{ items: FollowItem[] }>(`/me/follows/masters`),
  add: (masterId: string) =>
    apiPost<FollowItem>(`/me/follows/masters`, { master_id: masterId }),
  remove: (masterId: string) =>
    apiDelete<void>(`/me/follows/masters/${encodeURIComponent(masterId)}`),
  feedRead: (masterId: string, updateKey: string) =>
    apiPost<void>(`/me/follows/feed-reads`, {
      master_id: masterId,
      update_key: updateKey,
    }),
};
