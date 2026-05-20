/**
 * BookmarkContext — unified bookmark store across the app.
 *
 * Tracks five kinds: news / report / guide / master / stock. The first
 * four sync to the backend (`/me/bookmarks`); stocks stay local-only.
 * Each bookmark also carries optional `meta` (title / subtitle / href)
 * so the MyPage list can render without round-tripping back through
 * the source data arrays (mock or otherwise).
 *
 * Why a single flat `items` array now instead of per-type Sets:
 *   The old shape forced every consumer page (News, MyPage tab) to
 *   reach into a specific Set and reassemble titles by id-lookup against
 *   in-page mocks. That's why news bookmarks silently dropped on
 *   reload and the MyPage tab couldn't show them. A single
 *   chronologically-sorted array is what the UI actually wants.
 *
 * Public API kept for callers that already use it:
 *   - isReportBookmarked / toggleReportBookmark
 *   - isGuideBookmarked / toggleGuideBookmark
 *   - isNewsBookmarked / toggleNewsBookmark
 *   - isStockBookmarked / toggleStockBookmark
 *   - generic isBookmarked / addBookmark / removeBookmark  (now news-aware)
 *   - bookmarkedReportIds / bookmarkedGuideIds  (legacy)
 *
 * New on this revision:
 *   - bookmarkedItems: BookmarkItem[]  (chronological flat list)
 *   - bookmarkedNewsIds / bookmarkedMasterIds / bookmarkedStockIds
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookmarksService, type BookmarkKind } from "@/features/bookmarks";

export type BookmarkType = "news" | "report" | "guide" | "master" | "stock";

export interface BookmarkMeta {
  title?: string;
  subtitle?: string;
  href?: string;
}

export interface BookmarkItem extends BookmarkMeta {
  type: BookmarkType;
  id: string; // canonical (news id is stringified)
  added_at: number; // epoch ms
}

interface BookmarkContextType {
  // Per-type convenience
  isReportBookmarked: (id: string) => boolean;
  toggleReportBookmark: (id: string, meta?: BookmarkMeta) => void;
  isGuideBookmarked: (id: string) => boolean;
  toggleGuideBookmark: (id: string, meta?: BookmarkMeta) => void;
  isNewsBookmarked: (id: number | string) => boolean;
  toggleNewsBookmark: (id: number | string, meta?: BookmarkMeta) => void;
  isStockBookmarked: (ticker: string) => boolean;
  toggleStockBookmark: (ticker: string, meta?: BookmarkMeta) => void;
  // Generic
  isBookmarked: (type: BookmarkType | string, id: string | number) => boolean;
  addBookmark: (type: BookmarkType | string, id: string | number, meta?: BookmarkMeta) => void;
  removeBookmark: (type: BookmarkType | string, id: string | number) => void;
  // Read views
  bookmarkedItems: BookmarkItem[];
  bookmarkedReportIds: string[];
  bookmarkedGuideIds: string[];
  bookmarkedNewsIds: string[];
  bookmarkedMasterIds: string[];
  bookmarkedStockIds: string[];
  totalBookmarks: number;
}

export const BookmarkContext = createContext<BookmarkContextType | null>(null);
const STORAGE_KEY = "financelab_bookmarks_v2";
const LEGACY_KEY = "financelab_bookmarks";

const BACKEND_KIND: Record<BookmarkType, BookmarkKind | null> = {
  report: "reports",
  guide: "guides",
  news: "news",
  master: "masters",
  stock: null, // not backed by server
};

function loadFromStorage(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // One-time migration from the v1 schema (per-type Sets, no meta).
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const p = JSON.parse(legacy) as {
        reports?: string[]; guides?: string[]; news?: number[]; stocks?: string[]; masters?: string[];
      };
      const now = Date.now();
      const out: BookmarkItem[] = [];
      for (const id of p.reports ?? []) out.push({ type: "report", id, added_at: now });
      for (const id of p.guides ?? []) out.push({ type: "guide", id, added_at: now });
      for (const id of p.news ?? []) out.push({ type: "news", id: String(id), added_at: now });
      for (const id of p.stocks ?? []) out.push({ type: "stock", id, added_at: now });
      for (const id of p.masters ?? []) out.push({ type: "master", id, added_at: now });
      return out;
    }
  } catch { /* fall through */ }
  return [];
}

function saveToStorage(items: BookmarkItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

function normalizeType(t: BookmarkType | string): BookmarkType | null {
  if (t === "news" || t === "report" || t === "guide" || t === "master" || t === "stock") return t;
  return null;
}

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<BookmarkItem[]>(loadFromStorage);
  useEffect(() => { saveToStorage(items); }, [items]);

  // Hydrate from server on login (merge: server unions onto local).
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user) { hydratedFor.current = null; return; }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    (async () => {
      try {
        const res = await bookmarksService.list();
        setItems((prev) => {
          const next = [...prev];
          for (const it of res.items) {
            const type =
              it.kind === "reports" ? "report" :
              it.kind === "guides" ? "guide" :
              it.kind === "news" ? "news" :
              it.kind === "masters" ? "master" : null;
            if (!type) continue;
            if (!next.some((x) => x.type === type && x.id === it.ref)) {
              next.push({ type, id: it.ref, added_at: Date.now() });
            }
          }
          return next;
        });
      } catch { /* offline / unauthorized — keep local */ }
    })();
  }, [user]);

  const syncBackend = useCallback((type: BookmarkType, id: string, present: boolean) => {
    if (!user) return;
    const kind = BACKEND_KIND[type];
    if (!kind) return;
    (present ? bookmarksService.add(kind, id) : bookmarksService.remove(kind, id)).catch(() => {});
  }, [user]);

  const has = useCallback((type: BookmarkType, id: string) =>
    items.some((it) => it.type === type && it.id === id), [items]);

  const toggle = useCallback((type: BookmarkType, rawId: string | number, meta?: BookmarkMeta) => {
    const id = String(rawId);
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.type === type && it.id === id);
      if (idx >= 0) {
        const next = [...prev]; next.splice(idx, 1);
        syncBackend(type, id, false);
        return next;
      }
      syncBackend(type, id, true);
      return [...prev, { type, id, ...(meta ?? {}), added_at: Date.now() }];
    });
  }, [syncBackend]);

  const remove = useCallback((type: BookmarkType, rawId: string | number) => {
    const id = String(rawId);
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.type === type && it.id === id);
      if (idx < 0) return prev;
      const next = [...prev]; next.splice(idx, 1);
      syncBackend(type, id, false);
      return next;
    });
  }, [syncBackend]);

  const add = useCallback((type: BookmarkType, rawId: string | number, meta?: BookmarkMeta) => {
    const id = String(rawId);
    setItems((prev) => {
      if (prev.some((it) => it.type === type && it.id === id)) return prev;
      syncBackend(type, id, true);
      return [...prev, { type, id, ...(meta ?? {}), added_at: Date.now() }];
    });
  }, [syncBackend]);

  // Memoised derived views
  const bookmarkedItems = useMemo(
    () => [...items].sort((a, b) => b.added_at - a.added_at),
    [items],
  );
  const idsByType = useMemo(() => {
    const acc: Record<BookmarkType, string[]> = { news: [], report: [], guide: [], master: [], stock: [] };
    for (const it of items) acc[it.type].push(it.id);
    return acc;
  }, [items]);

  const value: BookmarkContextType = {
    isReportBookmarked: (id) => has("report", id),
    toggleReportBookmark: (id, meta) => toggle("report", id, meta),
    isGuideBookmarked: (id) => has("guide", id),
    toggleGuideBookmark: (id, meta) => toggle("guide", id, meta),
    isNewsBookmarked: (id) => has("news", String(id)),
    toggleNewsBookmark: (id, meta) => toggle("news", id, meta),
    isStockBookmarked: (ticker) => has("stock", ticker),
    toggleStockBookmark: (ticker, meta) => toggle("stock", ticker, meta),
    isBookmarked: (type, id) => {
      const t = normalizeType(type);
      return t ? has(t, String(id)) : false;
    },
    addBookmark: (type, id, meta) => {
      const t = normalizeType(type);
      if (t) add(t, id, meta);
    },
    removeBookmark: (type, id) => {
      const t = normalizeType(type);
      if (t) remove(t, id);
    },
    bookmarkedItems,
    bookmarkedReportIds: idsByType.report,
    bookmarkedGuideIds: idsByType.guide,
    bookmarkedNewsIds: idsByType.news,
    bookmarkedMasterIds: idsByType.master,
    bookmarkedStockIds: idsByType.stock,
    totalBookmarks: items.length,
  };

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}

export function useBookmark() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error("useBookmark must be used within BookmarkProvider");
  return ctx;
}
