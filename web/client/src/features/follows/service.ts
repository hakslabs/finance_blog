import { apiDelete, apiGet, apiPost } from "@/lib/http";

export interface FollowedMaster {
  master_id: string;
  followed_at: string;
}

export const followsService = {
  listMasters: () =>
    apiGet<{ items: FollowedMaster[] }>("/me/follows/masters").then((r) => r.items),
  followMaster: (master_id: string) =>
    apiPost<FollowedMaster>("/me/follows/masters", { master_id }),
  unfollowMaster: (master_id: string) =>
    apiDelete<{ unfollowed: string }>(`/me/follows/masters/${master_id}`),
};
