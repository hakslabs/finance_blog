/**
 * FollowContext - 고수 팔로우 시스템 (localStorage 기반)
 * 팔로우한 거장의 업데이트 소식(13F, 포트폴리오 변화, 인터뷰)을 피드로 제공
 * 백엔드 연동 시 localStorage → API + WebSocket으로 교체
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { MasterUpdate } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { followsService } from "@/features/follows";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isServerId = (s: string) => UUID_RE.test(s) || s.length <= 64; // most master slugs are short

interface FollowContextType {
  followedIds: Set<string>;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string, name: string) => void;
  follow: (id: string) => void;
  unfollow: (id: string) => void;
  followCount: number;
  // 팔로우한 거장들의 최신 업데이트 피드
  getFeed: (
    masters: {
      id: string;
      name: string;
      nameKo: string;
      updates?: MasterUpdate[];
    }[],
  ) => FeedItem[];
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

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followedIds, setFollowedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FOLLOW_KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  const [readKeys, setReadKeys] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(READ_KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(Array.from(followedIds)));
  }, [followedIds]);

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readKeys)));
  }, [readKeys]);

  // Hydrate from server on login
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    (async () => {
      try {
        const res = await followsService.listMasters();
        setFollowedIds((prev) => {
          const next = new Set(prev);
          for (const it of res.items) next.add(it.master_id);
          return next;
        });
      } catch {
        /* */
      }
    })();
  }, [user]);

  const syncAdd = (id: string) => {
    if (user && isServerId(id)) followsService.add(id).catch(() => {});
  };
  const syncRemove = (id: string) => {
    if (user && isServerId(id)) followsService.remove(id).catch(() => {});
  };

  const toggleFollow = useCallback(
    (id: string, _name: string) => {
      setFollowedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          syncRemove(id);
        } else {
          next.add(id);
          syncAdd(id);
        }
        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [user],
  );

  const follow = useCallback(
    (id: string) => {
      setFollowedIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        syncAdd(id);
        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [user],
  );

  const unfollow = useCallback(
    (id: string) => {
      setFollowedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        syncRemove(id);
        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [user],
  );

  const getFeed = useCallback(
    (
      masters: {
        id: string;
        name: string;
        nameKo: string;
        updates?: MasterUpdate[];
      }[],
    ): FeedItem[] => {
      const items: FeedItem[] = [];
      for (const m of masters) {
        if (!followedIds.has(m.id)) continue;
        for (const u of m.updates || []) {
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
    },
    [followedIds, readKeys],
  );

  const markAllRead = useCallback(() => {
    setReadKeys((prev) => new Set(prev));
  }, []);

  const unreadCount = 0;

  return (
    <FollowContext.Provider
      value={{
        followedIds,
        isFollowing: (id) => followedIds.has(id),
        toggleFollow,
        follow,
        unfollow,
        followCount: followedIds.size,
        getFeed,
        unreadCount,
        markAllRead,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error("useFollow must be used within FollowProvider");
  return ctx;
}
