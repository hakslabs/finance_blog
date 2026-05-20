/**
 * BookmarkContext — 통합 북마크 상태.
 *
 * 인증된 사용자: 서버(`saved_items` 테이블)에 영속.
 *   mount 시 서버에서 모든 kind를 한 번 fetch 후 합산.
 *   add/remove 는 optimistic update 후 서버 호출, 실패 시 롤백.
 * 비로그인: localStorage 동작 유지.
 *
 * 외부 API 표면(`toggle*`, `addBookmark(type, id)`)은 기존과 호환.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { bookmarksService, type BookmarkKind } from "@/features/bookmarks";
import { useAuth } from "@/contexts/AuthContext";

interface BookmarkState {
  reports: Set<string>;
  guides: Set<string>;
  news: Set<number>;
  stocks: Set<string>;
  masters: Set<string>;
}

interface BookmarkContextType {
  isReportBookmarked: (id: string) => boolean;
  toggleReportBookmark: (id: string) => void;
  isGuideBookmarked: (id: string) => boolean;
  toggleGuideBookmark: (id: string) => void;
  isNewsBookmarked: (id: number) => boolean;
  toggleNewsBookmark: (id: number) => void;
  isStockBookmarked: (ticker: string) => boolean;
  toggleStockBookmark: (ticker: string) => void;
  isBookmarked: (type: string, id: string) => boolean;
  addBookmark: (type: string, id: string, meta?: unknown) => void;
  removeBookmark: (type: string, id: string) => void;
  totalBookmarks: number;
  bookmarkedReportIds: string[];
  bookmarkedGuideIds: string[];
}

export const BookmarkContext = createContext<BookmarkContextType | null>(null);

const STORAGE_KEY = "financelab_bookmarks";

function loadFromStorage(): BookmarkState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { reports: new Set(), guides: new Set(), news: new Set(), stocks: new Set(), masters: new Set() };
    const parsed = JSON.parse(raw);
    return {
      reports: new Set<string>(parsed.reports || []),
      guides: new Set<string>(parsed.guides || []),
      news: new Set<number>(parsed.news || []),
      stocks: new Set<string>(parsed.stocks || []),
      masters: new Set<string>(parsed.masters || []),
    };
  } catch {
    return { reports: new Set(), guides: new Set(), news: new Set(), stocks: new Set(), masters: new Set() };
  }
}

function saveToStorage(state: BookmarkState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      reports: Array.from(state.reports),
      guides: Array.from(state.guides),
      news: Array.from(state.news),
      stocks: Array.from(state.stocks),
      masters: Array.from(state.masters),
    }));
  } catch { /* ignore */ }
}

const KIND_TO_KEY: Record<BookmarkKind, keyof BookmarkState> = {
  report: "reports",
  guide: "guides",
  news: "news",
  stock: "stocks",
  master: "masters",
};

const TYPE_TO_KIND: Record<string, BookmarkKind> = {
  report: "report",
  guide: "guide",
  news: "news",
  stock: "stock",
  master: "master",
};

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<BookmarkState>(loadFromStorage);

  useEffect(() => { saveToStorage(state); }, [state]);

  // 로그인 시 서버에서 hydrate.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!user) { hydratedRef.current = false; return; }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const items = await bookmarksService.list();
        setState((prev) => {
          const next: BookmarkState = {
            reports: new Set(prev.reports),
            guides: new Set(prev.guides),
            news: new Set(prev.news),
            stocks: new Set(prev.stocks),
            masters: new Set(prev.masters),
          };
          for (const it of items) {
            const key = KIND_TO_KEY[it.kind];
            if (key === "news") {
              const n = Number(it.target_id);
              if (!Number.isNaN(n)) next.news.add(n);
            } else {
              (next[key] as Set<string>).add(it.target_id);
            }
          }
          return next;
        });
      } catch { /* 로컬 유지 */ }
    })();
  }, [user]);

  // 공통 토글 (서버 동기화 포함).
  const persistAdd = useCallback((kind: BookmarkKind, target_id: string) => {
    if (!user) return;
    bookmarksService.add(kind, target_id).catch(() => {
      // 롤백
      setState(prev => {
        const key = KIND_TO_KEY[kind];
        if (key === "news") {
          const s = new Set(prev.news); s.delete(Number(target_id));
          return { ...prev, news: s };
        }
        const s = new Set(prev[key] as Set<string>); s.delete(target_id);
        return { ...prev, [key]: s };
      });
    });
  }, [user]);

  const persistRemove = useCallback((kind: BookmarkKind, target_id: string) => {
    if (!user) return;
    bookmarksService.remove(kind, target_id).catch(() => {
      setState(prev => {
        const key = KIND_TO_KEY[kind];
        if (key === "news") {
          const s = new Set(prev.news); s.add(Number(target_id));
          return { ...prev, news: s };
        }
        const s = new Set(prev[key] as Set<string>); s.add(target_id);
        return { ...prev, [key]: s };
      });
    });
  }, [user]);

  const toggleByKind = useCallback((kind: BookmarkKind, idStr: string) => {
    const key = KIND_TO_KEY[kind];
    let willAdd = false;
    setState(prev => {
      if (key === "news") {
        const n = Number(idStr);
        const s = new Set(prev.news);
        if (s.has(n)) { s.delete(n); willAdd = false; }
        else { s.add(n); willAdd = true; }
        return { ...prev, news: s };
      }
      const s = new Set(prev[key] as Set<string>);
      if (s.has(idStr)) { s.delete(idStr); willAdd = false; }
      else { s.add(idStr); willAdd = true; }
      return { ...prev, [key]: s };
    });
    if (willAdd) persistAdd(kind, idStr);
    else persistRemove(kind, idStr);
  }, [persistAdd, persistRemove]);

  const value: BookmarkContextType = {
    isReportBookmarked: (id) => state.reports.has(id),
    toggleReportBookmark: (id) => toggleByKind("report", id),
    isGuideBookmarked: (id) => state.guides.has(id),
    toggleGuideBookmark: (id) => toggleByKind("guide", id),
    isNewsBookmarked: (id) => state.news.has(id),
    toggleNewsBookmark: (id) => toggleByKind("news", String(id)),
    isStockBookmarked: (ticker) => state.stocks.has(ticker),
    toggleStockBookmark: (ticker) => toggleByKind("stock", ticker),
    isBookmarked: (type, id) => {
      const kind = TYPE_TO_KIND[type];
      if (!kind) return false;
      const key = KIND_TO_KEY[kind];
      if (key === "news") return state.news.has(Number(id));
      return (state[key] as Set<string>).has(id);
    },
    addBookmark: (type, id) => {
      const kind = TYPE_TO_KIND[type];
      if (!kind) return;
      const key = KIND_TO_KEY[kind];
      let didAdd = false;
      setState(prev => {
        if (key === "news") {
          const n = Number(id);
          if (prev.news.has(n)) return prev;
          const s = new Set(prev.news); s.add(n);
          didAdd = true;
          return { ...prev, news: s };
        }
        const cur = prev[key] as Set<string>;
        if (cur.has(id)) return prev;
        const s = new Set(cur); s.add(id);
        didAdd = true;
        return { ...prev, [key]: s };
      });
      if (didAdd) persistAdd(kind, id);
    },
    removeBookmark: (type, id) => {
      const kind = TYPE_TO_KIND[type];
      if (!kind) return;
      const key = KIND_TO_KEY[kind];
      let didRemove = false;
      setState(prev => {
        if (key === "news") {
          const n = Number(id);
          if (!prev.news.has(n)) return prev;
          const s = new Set(prev.news); s.delete(n);
          didRemove = true;
          return { ...prev, news: s };
        }
        const cur = prev[key] as Set<string>;
        if (!cur.has(id)) return prev;
        const s = new Set(cur); s.delete(id);
        didRemove = true;
        return { ...prev, [key]: s };
      });
      if (didRemove) persistRemove(kind, id);
    },
    totalBookmarks: state.reports.size + state.guides.size + state.news.size + state.stocks.size + state.masters.size,
    bookmarkedReportIds: Array.from(state.reports),
    bookmarkedGuideIds: Array.from(state.guides),
  };

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
}

export function useBookmark() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error("useBookmark must be used within BookmarkProvider");
  return ctx;
}
