import { flashcardDb } from './flashcardDb';
import { flashcardsApi } from '../api/flashcards';

export const syncService = {
  async syncOfflineReviews() {
    const queue = await flashcardDb.getSyncQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        await flashcardsApi.review(item.flashcard_id, item.quality);
        // Nếu API báo thành công, xoá khỏi hàng đợi
        await flashcardDb.removeSyncQueueItem(item.id);
      } catch (err: any) {
        // Nếu lỗi là mạng (không kết nối được), ta bỏ qua để lát thử lại
        // Nếu lỗi 400, 404 (do card không tồn tại nữa), ta cũng nên xoá khỏi queue để khỏi kẹt
        if (err?.status && err.status >= 400 && err.status < 500) {
          await flashcardDb.removeSyncQueueItem(item.id);
        }
      }
    }
  }
};
