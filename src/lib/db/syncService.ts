import { flashcardDb } from './flashcardDb';
import { flashcardsApi } from '../api/flashcards';
import { ApiError } from '../api/client';

let running = false;
let retryAfter = 0;
/** Sau một lần gửi thất bại do mạng/server, các lần gọi tự động (không `force`) chờ ngần này mili giây rồi mới thử lại. */
const RETRY_DELAY_MS = 15_000;

export interface SyncOutcome {
  /** Số lượt ôn vừa gửi lên server thành công. */
  synced: number;
  /** Số lượt ôn còn chờ gửi. */
  remaining: number;
}

export const syncService = {
  /** Đẩy hàng đợi review offline lên server theo đúng thứ tự đã ôn. Gọi lúc: sau mỗi lần ôn, mở màn học liệu,
   * app quay lại foreground, mạng trở lại (`force`). Có khoá chống chạy song song để cùng 1 review không bị gửi 2 lần.
   * Sau mỗi lượt gửi thành công, trạng thái thẻ trên máy được cập nhật theo kết quả server trả về. */
  async syncOfflineReviews(options: { force?: boolean } = {}): Promise<SyncOutcome> {
    if (running || (!options.force && Date.now() < retryAfter)) {
      return { synced: 0, remaining: (await flashcardDb.getSyncQueue()).length };
    }
    running = true;
    let synced = 0;
    try {
      const queue = await flashcardDb.getSyncQueue();
      for (const item of queue) {
        try {
          const result = await flashcardsApi.review(item.flashcard_id, item.quality);
          await flashcardDb.removeSyncQueueItem(item.id);
          await flashcardDb.applyServerResult(result);
          synced += 1;
        } catch (err) {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 401 && err.status !== 403 && err.status !== 429) {
            // Thẻ không còn tồn tại / dữ liệu không hợp lệ — bỏ khỏi hàng đợi để khỏi kẹt mãi.
            await flashcardDb.removeSyncQueueItem(item.id);
            continue;
          }
          // Lỗi mạng / 5xx / hết phiên / bị giới hạn — dừng, lần sau thử lại (giữ nguyên thứ tự).
          retryAfter = Date.now() + RETRY_DELAY_MS;
          break;
        }
      }
    } finally {
      running = false;
    }
    return { synced, remaining: (await flashcardDb.getSyncQueue()).length };
  },
};
