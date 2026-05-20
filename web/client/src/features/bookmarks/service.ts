import { apiDelete, apiGet, apiPost } from "@/lib/http";

export type BookmarkKind = "report" | "guide" | "news" | "stock" | "master";

export interface SavedItem {
  kind: BookmarkKind;
  target_id: string;
  note: string | null;
  saved_at: string | null;
}

export const bookmarksService = {
  list: (kind?: BookmarkKind) => {
    const qs = kind ? `?kind=${kind}` : "";
    return apiGet<{ items: SavedItem[] }>(`/me/bookmarks${qs}`).then((r) => r.items);
  },
  add: (kind: BookmarkKind, target_id: string, note?: string) =>
    apiPost<SavedItem>("/me/bookmarks", { kind, target_id, note }),
  remove: (kind: BookmarkKind, target_id: string) =>
    apiDelete<{ removed: { kind: string; target_id: string } }>(
      `/me/bookmarks/${kind}/${encodeURIComponent(target_id)}`,
    ),
};
