import { api } from '@/lib/api/client';
import type { LessonPlayer, LessonProgress } from '@/types/lesson';

export const lessonsApi = {
  getPlayer(lessonId: number): Promise<LessonPlayer> {
    return api.get<LessonPlayer>(`/api/v1/lessons/${lessonId}/player`);
  },

  /** Gọi mỗi ~15s + lúc pause/seek/unload — xem docblock BE `LessonProgressController`. */
  recordProgress(lessonId: number, watchedSec: number, lastPositionSec: number): Promise<LessonProgress> {
    return api.post<LessonProgress>(`/api/v1/lessons/${lessonId}/progress`, {
      watchedSec,
      lastPositionSec,
    });
  },

  sendHeartbeat: async (lessonId: number, sessionId: string, deviceName: string, force: boolean): Promise<void> => {
    await api.post<void>(`/api/v1/lessons/${lessonId}/heartbeat`, { sessionId, deviceName, force });
  },
};
