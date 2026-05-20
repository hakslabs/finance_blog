/**
 * Bookmarks across kinds: news, reports, masters, guides.
 *
 * Backend: saved_items table (mig 0022) — (user_id, kind, ref).
 */
import { apiGet, apiPost, apiDelete } from "@/lib/http";

export type BookmarkKind = "news" | "reports" | "masters" | "guides";

export interface BookmarkItem {
  kind: BookmarkKind;
  ref: string;
  created_at?: string;
}

export const bookmarksService = {
  list: (kind?: BookmarkKind) =>
    apiGet<{ items: BookmarkItem[] }>(`/me/bookmarks${kind ? `?kind=${kind}` : ""}`),
  add: (kind: BookmarkKind, ref: string) =>
    apiPost<BookmarkItem>(`/me/bookmarks`, { kind, ref }),
  remove: (kind: BookmarkKind, ref: string) =>
    apiDelete<void>(`/me/bookmarks/${kind}/${encodeURIComponent(ref)}`),
};
