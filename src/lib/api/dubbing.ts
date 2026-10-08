import { api } from '@/lib/api/client';
import type { DubbingActivateResult, DubbingCancelResult } from '@/types/dubbing';

export const dubbingApi = {
  activate: (lessonId: number, targetLanguage: string, voiceName?: string | null) =>
    api.post<DubbingActivateResult>(`/api/v1/lessons/${lessonId}/dubbing/activate`, {
      targetLanguage,
      voiceName,
    }),

  cancel: (lessonId: number, targetLanguage: string) =>
    api.post<DubbingCancelResult>(`/api/v1/lessons/${lessonId}/dubbing/cancel`, {
      targetLanguage,
    }),
};
