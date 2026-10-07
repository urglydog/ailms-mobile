import { api } from '@/lib/api/client';
import type { FlashcardReviewResult } from '@/types/material';

export const flashcardsApi = {
  /** `quality`: 0=Again, 2=Hard, 3=Good, 5=Easy — khớp thang điểm thuật toán SM-2 phía BE. */
  review(flashcardId: number, quality: number): Promise<FlashcardReviewResult> {
    return api.post<FlashcardReviewResult>(`/api/v1/flashcards/${flashcardId}/review`, { quality });
  },
};
