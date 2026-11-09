import { getDb } from './index';
import type { FlashcardCard } from '@/types/material';

export const flashcardDb = {
  async syncMaterialFlashcards(materialId: number, cards: FlashcardCard[]) {
    const db = await getDb();

    // Thẻ còn review chờ đồng bộ (hàng đợi) giữ nguyên tiến độ cục bộ — nếu ghi đè bằng dữ liệu
    // server (chưa biết lần ôn đó) thì học viên thấy thẻ vừa ôn "quay lại" và phải ôn lần nữa.
    const pending = await db.getAllAsync<{ flashcard_id: number }>('SELECT * FROM flashcard_sync_queue');
    const pendingIds = new Set(pending.map((r) => r.flashcard_id));
    const keep = (await db.getAllAsync<any>('SELECT * FROM flashcards WHERE material_id = ?', materialId)).filter((r) =>
      pendingIds.has(r.id),
    );
    const keepById = new Map<number, any>(keep.map((r) => [r.id, r]));

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
            local ? local.next_review_at : card.nextReviewAt,
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

  async getMaterialCache(materialId: number): Promise<string | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ json: string }>('SELECT * FROM material_cache WHERE material_id = ?', materialId);
    return row?.json ?? null;
  },

  async getOfflineFlashcards(materialId: number): Promise<FlashcardCard[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM flashcards WHERE material_id = ?', materialId);
    
    return rows.map((row) => ({
      id: row.id,
      frontText: row.front_text,
      backText: row.back_text,
      nextReviewAt: row.next_review_at,
      intervalDays: row.interval_days,
      repetitions: row.repetitions,
      easiness: row.easiness,
      isDue: row.is_due === 1,
    }));
  },

  async recordReview(flashcardId: number, quality: number) {
    const db = await getDb();
    const now = new Date().toISOString();
    
    // Ghi vào hàng đợi đồng bộ
    await db.runAsync(
      'INSERT INTO flashcard_sync_queue (flashcard_id, quality, created_at) VALUES (?, ?, ?)',
      [flashcardId, quality, now]
    );

    // Thuật toán giả lập tính toán Spaced Repetition cho offline (SuperMemo 2 basic)
    // Để có thể cập nhật trạng thái UI offline ngay lập tức.
    // Thực tế server sẽ tính lại chính xác hơn lúc đồng bộ.
    const card = await db.getFirstAsync<any>('SELECT * FROM flashcards WHERE id = ?', flashcardId);
    if (card) {
      let { repetitions, easiness, interval_days } = card;
      
      if (quality >= 3) {
        if (repetitions === 0) interval_days = 1;
        else if (repetitions === 1) interval_days = 6;
        else interval_days = Math.round(interval_days * easiness);
        
        repetitions += 1;
      } else {
        repetitions = 0;
        interval_days = 1;
      }
      
      easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easiness < 1.3) easiness = 1.3;
      
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + interval_days);
      
      await db.runAsync(
        'UPDATE flashcards SET next_review_at = ?, interval_days = ?, repetitions = ?, easiness = ?, is_due = 0 WHERE id = ?',
        [nextReviewDate.toISOString(), interval_days, repetitions, easiness, flashcardId]
      );
    }
  },

  async getSyncQueue() {
    const db = await getDb();
    return db.getAllAsync<any>('SELECT * FROM flashcard_sync_queue ORDER BY created_at ASC');
  },

  async removeSyncQueueItem(id: number) {
    const db = await getDb();
    await db.runAsync('DELETE FROM flashcard_sync_queue WHERE id = ?', id);
  }
};
