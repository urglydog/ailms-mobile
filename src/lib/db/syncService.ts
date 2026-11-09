import { flashcardDb } from './flashcardDb';
import { flashcardsApi } from '../api/flashcards';
import { ApiError } from '../api/client';

let running = false;

export const syncService = {
  /** Đẩy hàng đợi review offline lên server. Gọi lúc: sau mỗi lần ôn, mở màn học liệu, app quay
   * lại foreground. Có khoá chống chạy song song để cùng 1 review không bị gửi 2 lần. */
  async syncOfflineReviews() {
    if (running) return;
    running = true;
    try {
      const queue = await flashcardDb.getSyncQueue();
      for (const item of queue) {
        try {
          await flashcardsApi.review(item.flashcard_id, item.quality);
          await flashcardDb.removeSyncQueueItem(item.id);
        } catch (err) {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 401 && err.status !== 403 && err.status !== 429) {
            // Thẻ không còn tồn tại / dữ liệu không hợp lệ — bỏ khỏi hàng đợi để khỏi kẹt mãi.
            await flashcardDb.removeSyncQueueItem(item.id);
            continue;
          }
          // Lỗi mạng / 5xx / hết phiên / bị giới hạn — dừng, lần sau thử lại (giữ nguyên thứ tự).
          break;
        }
      }
    } finally {
      running = false;
    }
  },
};
