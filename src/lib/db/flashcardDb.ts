import { getDb } from './index';
import { computeReview, isCardDue } from './srs';
import type { FlashcardCard, FlashcardReviewResult, MaterialDetail } from '@/types/material';

interface FlashcardRow {
  id: number;
  material_id: number;
  front_text: string;
  back_text: string;
  next_review_at: string;
  interval_days: number;
  repetitions: number;
  easiness: number;
  is_due: number;
}

interface SyncQueueRow {
  id: number;
  flashcard_id: number;
  quality: number;
  created_at: string;
}

interface MaterialCacheRow {
  material_id: number;
  json: string;
}

/** Một bộ thẻ đã lưu trên máy (hiện ở màn "Ôn tập offline"). */
export interface OfflineDeck {
  materialId: number;
  title: string;
  language: string;
  total: number;
  due: number;
  /** Số lượt ôn của bộ này chưa gửi lên server. */
  pending: number;
}

function toCard(row: FlashcardRow): FlashcardCard {
  return {
    id: row.id,
    frontText: row.front_text,
    backText: row.back_text,
    nextReviewAt: row.next_review_at,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    easiness: row.easiness,
    // Đến hạn tính theo giờ hiện tại mỗi lần đọc (không dựa cờ lưu sẵn — cờ đó không tự đổi khi offline lâu ngày).
    isDue: isCardDue(row.next_review_at),
  };
}

export const flashcardDb = {
  async syncMaterialFlashcards(materialId: number, cards: FlashcardCard[]) {
    const db = await getDb();

    // Thẻ còn review chờ đồng bộ (hàng đợi) giữ nguyên tiến độ cục bộ — nếu ghi đè bằng dữ liệu
    // server (chưa biết lần ôn đó) thì học viên thấy thẻ vừa ôn "quay lại" và phải ôn lần nữa.
    const pending = await db.getAllAsync<SyncQueueRow>('SELECT * FROM flashcard_sync_queue');
    const pendingIds = new Set(pending.map((r) => r.flashcard_id));
    const keep = (await db.getAllAsync<FlashcardRow>('SELECT * FROM flashcards WHERE material_id = ?', materialId)).filter((r) =>
      pendingIds.has(r.id),
    );
    const keepById = new Map<number, FlashcardRow>(keep.map((r) => [r.id, r]));

    // Xóa card cũ của material này rồi chèn lại trong 1 giao dịch (tránh còn nửa chừng nếu app bị
    // tắt giữa lúc ghi, và tránh rác nếu card bị xoá trên server).
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM flashcards WHERE material_id = ?', materialId);
      for (const card of cards) {
        const local = keepById.get(card.id);
        await db.runAsync(
          `INSERT INTO flashcards (id, material_id, front_text, back_text, next_review_at, interval_days, repetitions, easiness, is_due)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            card.id,
            materialId,
            card.frontText,
            card.backText,
            // Thẻ mới chưa từng ôn có thể chưa có giờ ôn → lưu rỗng (coi là đến hạn ngay).
            local ? local.next_review_at : (card.nextReviewAt ?? ''),
            local ? local.interval_days : card.intervalDays,
            local ? local.repetitions : card.repetitions,
            local ? local.easiness : card.easiness,
            local ? local.is_due : card.isDue ? 1 : 0,
          ],
        );
      }
    });
  },

  /** Lưu bản chi tiết học liệu lần tải gần nhất để mở được khi mất mạng. */
  async saveMaterialCache(materialId: number, json: string) {
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO material_cache (material_id, json) VALUES (?, ?)', [materialId, json]);
  },

  /** Lưu trọn bộ thẻ (thẻ + bản chi tiết) để ôn offline. Không làm gì nếu không phải flashcard. */
  async saveDeck(detail: MaterialDetail): Promise<boolean> {
    if (detail.materialType !== 'FLASHCARD' || !detail.flashcards) return false;
    await flashcardDb.syncMaterialFlashcards(detail.id, detail.flashcards);
    await flashcardDb.saveMaterialCache(detail.id, JSON.stringify(detail));
    return true;
  },

  async getMaterialCache(materialId: number): Promise<string | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<MaterialCacheRow>('SELECT * FROM material_cache WHERE material_id = ?', materialId);
    return row?.json ?? null;
  },

  async getOfflineFlashcards(materialId: number): Promise<FlashcardCard[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<FlashcardRow>('SELECT * FROM flashcards WHERE material_id = ?', materialId);
    return rows.map(toCard);
  },

  /** Danh sách bộ thẻ đã lưu trên máy, kèm số thẻ và số thẻ đến hạn ôn. */
  async listOfflineDecks(): Promise<OfflineDeck[]> {
    const db = await getDb();
    const caches = await db.getAllAsync<MaterialCacheRow>('SELECT * FROM material_cache');
    const cards = await db.getAllAsync<FlashcardRow>('SELECT * FROM flashcards');
    const queue = await db.getAllAsync<SyncQueueRow>('SELECT * FROM flashcard_sync_queue');
    const materialOfCard = new Map<number, number>(cards.map((c) => [c.id, c.material_id]));

    const decks: OfflineDeck[] = [];
    for (const cache of caches) {
      let title = '';
      let language = '';
      try {
        const parsed = JSON.parse(cache.json) as Partial<MaterialDetail>;
        title = parsed.title ?? '';
        language = parsed.language ?? '';
      } catch {
        // Bản lưu hỏng — vẫn liệt kê để người học xoá được.
      }
      const own = cards.filter((c) => c.material_id === cache.material_id);
      decks.push({
        materialId: cache.material_id,
        title: title || `Bộ thẻ #${cache.material_id}`,
        language,
        total: own.length,
        due: own.filter((c) => isCardDue(c.next_review_at)).length,
        pending: queue.filter((q) => materialOfCard.get(q.flashcard_id) === cache.material_id).length,
      });
    }
    return decks.sort((a, b) => b.due - a.due || a.title.localeCompare(b.title));
  },

  /** Xoá bản lưu của một bộ thẻ. Từ chối (trả `false`) nếu còn lượt ôn chưa gửi lên server để không mất tiến độ. */
  async removeDeck(materialId: number): Promise<boolean> {
    const db = await getDb();
    const cards = await db.getAllAsync<FlashcardRow>('SELECT * FROM flashcards WHERE material_id = ?', materialId);
    const ids = new Set(cards.map((c) => c.id));
    const queue = await db.getAllAsync<SyncQueueRow>('SELECT * FROM flashcard_sync_queue');
    if (queue.some((q) => ids.has(q.flashcard_id))) return false;
    await db.runAsync('DELETE FROM flashcards WHERE material_id = ?', materialId);
    await db.runAsync('DELETE FROM material_cache WHERE material_id = ?', materialId);
    return true;
  },

  async recordReview(flashcardId: number, quality: number) {
    const db = await getDb();
    const now = new Date();

    // Ghi vào hàng đợi đồng bộ
    await db.runAsync('INSERT INTO flashcard_sync_queue (flashcard_id, quality, created_at) VALUES (?, ?, ?)', [
      flashcardId,
      quality,
      now.toISOString(),
    ]);

    // Tính lịch ôn ngay trên máy theo đúng công thức của BE (xem `srs.ts`) để giao diện offline cập nhật tức thì;
    // khi đồng bộ, kết quả server (cùng công thức) sẽ ghi đè lại.
    const card = await db.getFirstAsync<FlashcardRow>('SELECT * FROM flashcards WHERE id = ?', flashcardId);
    if (!card) return;
    const next = computeReview(
      { intervalDays: card.interval_days, repetitions: card.repetitions, easiness: card.easiness },
      quality,
    );
    const nextReviewAt = new Date(now.getTime() + next.intervalMinutes * 60_000).toISOString();
    await db.runAsync(
      'UPDATE flashcards SET next_review_at = ?, interval_days = ?, repetitions = ?, easiness = ?, is_due = 0 WHERE id = ?',
      [nextReviewAt, next.intervalDays, next.repetitions, next.easiness, flashcardId],
    );
  },

  /** Ghi đè trạng thái thẻ bằng kết quả server vừa trả — trừ khi thẻ đó còn lượt ôn khác đang chờ gửi (khi đó giữ bản máy). */
  async applyServerResult(result: FlashcardReviewResult) {
    const db = await getDb();
    const queue = await db.getAllAsync<SyncQueueRow>('SELECT * FROM flashcard_sync_queue');
    if (queue.some((q) => q.flashcard_id === result.flashcardId)) return;
    await db.runAsync(
      'UPDATE flashcards SET next_review_at = ?, interval_days = ?, repetitions = ?, easiness = ?, is_due = 0 WHERE id = ?',
      [result.nextReviewAt, result.intervalDays, result.repetitions, result.easiness, result.flashcardId],
    );
  },

  async getSyncQueue(): Promise<SyncQueueRow[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<SyncQueueRow>('SELECT * FROM flashcard_sync_queue');
    return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  },

  async removeSyncQueueItem(id: number) {
    const db = await getDb();
    await db.runAsync('DELETE FROM flashcard_sync_queue WHERE id = ?', id);
  },
};
