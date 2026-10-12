import { getDb } from './index';
import type { FlashcardCard } from '@/types/material';

export const flashcardDb = {
  async syncMaterialFlashcards(materialId: number, cards: FlashcardCard[]) {
    const db = await getDb();
    
    // Xóa các card cũ của material này trước khi sync mới (để tránh rác nếu card bị xoá trên server)
    await db.runAsync('DELETE FROM flashcards WHERE material_id = ?', materialId);
    
    // Insert thẻ mới
    for (const card of cards) {
      await db.runAsync(
        `INSERT INTO flashcards (id, material_id, front_text, back_text, next_review_at, interval_days, repetitions, easiness, is_due)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          card.id,
          materialId,
          card.frontText,
          card.backText,
          card.nextReviewAt,
          card.intervalDays,
          card.repetitions,
          card.easiness,
          card.isDue ? 1 : 0,
        ]
      );
    }
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
