import { api, apiFormData } from '@/lib/api/client';
import type { FlashcardCard, FlashcardReviewResult } from '@/types/material';

export interface FlashcardImportResult {
  importedCount: number;
  errors: string[];
}

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

  /** Thêm một thẻ vào bộ thẻ CÁ NHÂN. Dù path ghi `deck`, tham số là ID học liệu (bản sinh) chứ không phải ID bộ thẻ — giống web. */
  add(materialId: number, data: { frontText: string; backText: string }): Promise<FlashcardCard> {
    return api.post<FlashcardCard>(`/api/v1/flashcards/deck/${materialId}`, data);
  },

  /** Nhập thẻ từ file .txt (mỗi dòng: mặt trước, ký tự Tab, mặt sau — định dạng xuất của Anki/Quizlet). */
  importTxt(materialId: number, file: { uri: string; name: string; mimeType: string }): Promise<FlashcardImportResult> {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    return apiFormData<FlashcardImportResult>(`/api/v1/flashcards/deck/${materialId}/import-txt`, formData);
  },
};
