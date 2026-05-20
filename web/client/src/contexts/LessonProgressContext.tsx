/**
 * LessonProgressContext — 레슨 완독 상태.
 *
 * 인증된 사용자: `lesson_progress` 테이블에 upsert.
 * 비로그인: localStorage 동작.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { lessonsService } from "@/features/lessons";
import { useAuth } from "@/contexts/AuthContext";

interface LessonProgressContextType {
  completedIds: Set<string>;
  isCompleted: (lessonId: string) => boolean;
  setCompleted: (lessonId: string, completed: boolean) => void;
}

const LessonProgressContext = createContext<LessonProgressContextType | null>(null);

const STORAGE_KEY = "financelab_lesson_progress";

export function LessonProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completedIds)));
  }, [completedIds]);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!user) { hydratedRef.current = false; return; }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const items = await lessonsService.list();
        setCompletedIds((prev) => {
          const next = new Set(prev);
          for (const it of items) {
            if (it.completed) next.add(it.lesson_id);
            else next.delete(it.lesson_id);
          }
          return next;
        });
      } catch { /* 로컬 유지 */ }
    })();
  }, [user]);

  const setCompleted = useCallback((lessonId: string, completed: boolean) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (completed) next.add(lessonId);
      else next.delete(lessonId);
      return next;
    });
    if (user) {
      lessonsService.setCompleted(lessonId, completed).catch(() => {
        // 롤백
        setCompletedIds(prev => {
          const next = new Set(prev);
          if (completed) next.delete(lessonId);
          else next.add(lessonId);
          return next;
        });
      });
    }
  }, [user]);

  return (
    <LessonProgressContext.Provider value={{
      completedIds,
      isCompleted: (id) => completedIds.has(id),
      setCompleted,
    }}>
      {children}
    </LessonProgressContext.Provider>
  );
}

export function useLessonProgress() {
  const ctx = useContext(LessonProgressContext);
  if (!ctx) throw new Error("useLessonProgress must be used within LessonProgressProvider");
  return ctx;
}
