import { apiGet, apiPost, apiPut } from "@/lib/http";
import type { LearnGuide } from "@/types";
import { useAsync } from "@/features/_shared/useAsync";
import { LEARN_GUIDES } from "@/services/mockData";

export interface Chapter {
  id: string;
  title: string;
  description?: string;
  category: string;
  position: number;
}

export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  completed_at?: string;
}

export const lessonsService = {
  chapters: () => apiGet<{ items: Chapter[] }>(`/lessons/chapters`),
  list: (chapterId?: string) =>
    apiGet<{ items: LearnGuide[] }>(
      chapterId ? `/lessons?chapter_id=${encodeURIComponent(chapterId)}` : `/lessons`,
    ),
  get: (id: string) => apiGet<LearnGuide & { content?: string; quiz?: unknown[] }>(`/lessons/${encodeURIComponent(id)}`),
  myProgress: () => apiGet<{ items: LessonProgress[] }>(`/me/lesson-progress`),
  setCompleted: (lessonId: string, completed: boolean) =>
    apiPut<LessonProgress>(`/me/lesson-progress/${encodeURIComponent(lessonId)}`, { completed }),
  submitQuiz: (lessonId: string, body: {
    score: number; total_questions: number; correct_count: number; answers?: number[];
  }) => apiPost<{ id: string; score: number }>(`/me/lessons/${encodeURIComponent(lessonId)}/quiz`, body),
};

export function useChapters() {
  return useAsync(() => lessonsService.chapters().then((r) => r.items), []);
}

export function useLessons(chapterId?: string) {
  return useAsync(
    () => lessonsService.list(chapterId).then((r) => r.items),
    [chapterId ?? ""],
    LEARN_GUIDES,
  );
}

export function useLesson(id: string | undefined) {
  const fallback = id ? LEARN_GUIDES.find((g) => g.id === id) ?? null : null;
  return useAsync(
    () => (id ? lessonsService.get(id) : Promise.reject(new Error("no id"))),
    [id],
    fallback,
  );
}
