/**
 * SQLite offline (Flashcard) là tính năng NATIVE-only (xem UpComming_Plan.md, Giai đoạn 10-11) —
 * `expo-sqlite`'s web implementation yêu cầu asset `.wasm` mà Metro không resolve được trong môi
 * trường này (`Unable to resolve module ./wa-sqlite/wa-sqlite.wasm`), làm SẬP TOÀN BỘ bundle web
 * (kể cả các màn không liên quan tới Flashcard) vì `material/[id].tsx` import `syncService` →
 * `flashcardDb` → `./index` (bản gốc dùng `expo-sqlite`) KHÔNG ĐIỀU KIỆN cho mọi loại học liệu.
 *
 * File `.web.ts` này được Metro tự động ưu tiên khi bundle cho web (cùng cơ chế `.ts`/`.web.ts`
 * đã dùng ở `MindmapView.web.tsx`) — thay `expo-sqlite` thật bằng 1 bản mock trong bộ nhớ (mất
 * khi reload trang, không đồng bộ thật), đủ để `flashcardDb.ts`/`syncService.ts` chạy không crash
 * khi xem trước trên web (`expo start --web`) — hành vi offline thật chỉ cần đúng trên thiết bị
 * native, nơi dùng `index.ts` gốc.
 */
interface FakeRow {
  [key: string]: unknown;
}

const flashcardsTable: FakeRow[] = [];
const syncQueueTable: FakeRow[] = [];
let nextSyncQueueId = 1;

const webDb = {
  async execAsync() {
    // Schema đã "tồn tại sẵn" dưới dạng mảng JS — không cần CREATE TABLE.
  },

  async runAsync(sql: string, params?: unknown) {
    const args = Array.isArray(params) ? params : params !== undefined ? [params] : [];
    const normalized = sql.trim().toUpperCase();

    if (normalized.startsWith('DELETE FROM FLASHCARDS')) {
      const materialId = args[0];
      for (let i = flashcardsTable.length - 1; i >= 0; i--) {
        if (flashcardsTable[i]?.material_id === materialId) flashcardsTable.splice(i, 1);
      }
    } else if (normalized.startsWith('INSERT INTO FLASHCARDS')) {
      const [id, material_id, front_text, back_text, next_review_at, interval_days, repetitions, easiness, is_due] = args;
      flashcardsTable.push({ id, material_id, front_text, back_text, next_review_at, interval_days, repetitions, easiness, is_due });
    } else if (normalized.startsWith('UPDATE FLASHCARDS')) {
      const [next_review_at, interval_days, repetitions, easiness, id] = args;
      const row = flashcardsTable.find((r) => r.id === id);
      if (row) Object.assign(row, { next_review_at, interval_days, repetitions, easiness, is_due: 0 });
    } else if (normalized.startsWith('INSERT INTO FLASHCARD_SYNC_QUEUE')) {
      const [flashcard_id, quality, created_at] = args;
      syncQueueTable.push({ id: nextSyncQueueId++, flashcard_id, quality, created_at });
    } else if (normalized.startsWith('DELETE FROM FLASHCARD_SYNC_QUEUE')) {
      const id = args[0];
      const idx = syncQueueTable.findIndex((r) => r.id === id);
      if (idx >= 0) syncQueueTable.splice(idx, 1);
    }
  },

  async getAllAsync<T>(sql: string, params?: unknown): Promise<T[]> {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('SELECT * FROM FLASHCARDS')) {
      const materialId = Array.isArray(params) ? params[0] : params;
      return flashcardsTable.filter((r) => r.material_id === materialId) as T[];
    }
    if (normalized.startsWith('SELECT * FROM FLASHCARD_SYNC_QUEUE')) {
      return [...syncQueueTable].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))) as T[];
    }
    return [] as T[];
  },

  async getFirstAsync<T>(sql: string, params?: unknown): Promise<T | null> {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('SELECT * FROM FLASHCARDS')) {
      const id = Array.isArray(params) ? params[0] : params;
      return (flashcardsTable.find((r) => r.id === id) as T) ?? null;
    }
    return null;
  },
};

export async function getDb() {
  return webDb;
}
