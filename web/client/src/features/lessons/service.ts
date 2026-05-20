import { apiGet, apiPut } from "@/lib/http";

export interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  updated_at: string | null;
}

export const lessonsService = {
  list: () =>
    apiGet<{ items: LessonProgress[] }>("/me/lesson-progress").then((r) => r.items),
  setCompleted: (lesson_id: string, completed: boolean) =>
    apiPut<LessonProgress>(
      `/me/lesson-progress/${encodeURIComponent(lesson_id)}`,
      { completed },
    ),
};
