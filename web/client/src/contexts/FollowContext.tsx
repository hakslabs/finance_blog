/**
 * FollowContext — 마스터 팔로우 상태.
 *
 * 인증된 사용자: Supabase `followed_masters` 테이블에 영속.
 *   - mount 시 서버에서 followed master_id 목록을 가져온다.
 *   - follow/unfollow 는 optimistic update 후 서버 호출, 실패 시 롤백.
 * 비로그인 사용자(또는 supabase 미설정): localStorage 동작 유지.
 *
 * mock 데이터(`m.id`가 UUID 형식이 아닌 경우)는 서버에 저장하지 않고
 * 로컬에만 둔다 — DB FK 위반을 피하기 위함.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { MasterUpdate } from "@/types";
import { followsService } from "@/features/follows";
import { useAuth } from "@/contexts/AuthContext";

interface FollowContextType {
  followedIds: Set<string>;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string, name: string) => void;
  follow: (id: string) => void;
  unfollow: (id: string) => void;
  followCount: number;
  getFeed: (masters: { id: string; name: string; nameKo: string; updates?: MasterUpdate[] }[]) => FeedItem[];
  unreadCount: number;
  markAllRead: () => void;
}

export interface FeedItem {
  masterId: string;
  masterName: string;
  masterNameKo: string;
  update: MasterUpdate;
  isRead: boolean;
}

export const FollowContext = createContext<FollowContextType | null>(null);

const FOLLOW_KEY = "financelab_follows";
const READ_KEY = "financelab_feed_read";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [followedIds, setFollowedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FOLLOW_KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  const [readKeys, setReadKeys] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(READ_KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  // 항상 localStorage에 미러링 — 비로그인 + 오프라인 fallback.
  useEffect(() => {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(Array.from(followedIds)));
  }, [followedIds]);

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readKeys)));
  }, [readKeys]);

  // 로그인 시 서버에서 follows 동기화 (1회).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!user) { hydratedRef.current = false; return; }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const items = await followsService.listMasters();
        setFollowedIds((prev) => {
          const next = new Set(prev);
          for (const it of items) next.add(it.master_id);
          return next;
        });
      } catch {
        // 서버 실패 시 로컬 상태 유지.
      }
    })();
  }, [user]);

  const follow = useCallback((id: string) => {
    setFollowedIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (user && isUuid(id)) {
      followsService.followMaster(id).catch(() => {
        setFollowedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    }
  }, [user]);

  const unfollow = useCallback((id: string) => {
    setFollowedIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (user && isUuid(id)) {
      followsService.unfollowMaster(id).catch(() => {
        setFollowedIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      });
    }
  }, [user]);

  const toggleFollow = useCallback((id: string, _name: string) => {
    if (followedIds.has(id)) unfollow(id);
    else follow(id);
  }, [followedIds, follow, unfollow]);

  const getFeed = useCallback((masters: { id: string; name: string; nameKo: string; updates?: MasterUpdate[] }[]): FeedItem[] => {
    const items: FeedItem[] = [];
    for (const m of masters) {
      if (!followedIds.has(m.id)) continue;
      for (const u of (m.updates || [])) {
        const key = `${m.id}_${u.date}_${u.type}`;
        items.push({
          masterId: m.id,
          masterName: m.name,
          masterNameKo: m.nameKo,
          update: u,
          isRead: readKeys.has(key),
        });
      }
    }
    return items.sort((a, b) => b.update.date.localeCompare(a.update.date));
  }, [followedIds, readKeys]);

  const markAllRead = useCallback(() => {
    setReadKeys(prev => new Set(prev));
  }, []);

  const unreadCount = 0;

  return (
    <FollowContext.Provider value={{
      followedIds,
      isFollowing: (id) => followedIds.has(id),
      toggleFollow,
      follow,
      unfollow,
      followCount: followedIds.size,
      getFeed,
      unreadCount,
      markAllRead,
    }}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error("useFollow must be used within FollowProvider");
  return ctx;
}
