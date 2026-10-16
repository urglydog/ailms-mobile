import { api } from '@/lib/api/client';
import type { FlashcardReviewResult } from '@/types/material';

export const flashcardsApi = {
  /** `quality`: 0=Again, 2=Hard, 3=Good, 5=Easy — khớp thang điểm thuật toán SM-2 phía BE. */
  review(flashcardId: number, quality: number): Promise<FlashcardReviewResult> {
    return api.post<FlashcardReviewResult>(`/api/v1/flashcards/${flashcardId}/review`, { quality });
  },

  /** Port từ `fe/lib/api/flashcards.ts` — mobile trước đây chỉ xem được flashcard, chưa sửa/xoá
   * được (web `FlashcardViewer.tsx` đã có từ lâu). */
  update(flashcardId: number, data: { frontText?: string; backText?: string }): Promise<void> {
    return api.patch(`/api/v1/flashcards/${flashcardId}`, data);
  },

  delete(flashcardId: number): Promise<void> {
    return api.delete(`/api/v1/flashcards/${flashcardId}`);
  },
};
