import { useMutation } from '@tanstack/react-query';
import { dubbingApi } from '@/lib/api/dubbing';

export function useActivateDubbing() {
  return useMutation({
    mutationFn: ({
      lessonId,
      targetLanguage,
      voiceName,
    }: {
      lessonId: number;
      targetLanguage: string;
      voiceName?: string | null;
    }) => dubbingApi.activate(lessonId, targetLanguage, voiceName),
  });
}

export function useCancelDubbing() {
  return useMutation({
    mutationFn: ({ lessonId, targetLanguage }: { lessonId: number; targetLanguage: string }) =>
      dubbingApi.cancel(lessonId, targetLanguage),
  });
}
