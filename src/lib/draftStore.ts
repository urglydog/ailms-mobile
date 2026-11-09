import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Lưu nháp đáp án bài thi xuống file cục bộ (sống sót khi app bị đóng/văng giữa chừng) — tương đương
 * `localStorage` `exam_draft_*` của web. Mọi thao tác bọc try/catch: lỗi lưu nháp không được chặn thi.
 * Trên web (expo start --web) không có hệ file → bỏ qua.
 */
function draftFile(key: string): File | null {
  if (Platform.OS === 'web') return null;
  const dir = new Directory(Paths.document, 'drafts');
  if (!dir.exists) dir.create({ intermediates: true });
  return new File(dir, `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
}

export async function readDraft<T>(key: string): Promise<T | null> {
  try {
    const file = draftFile(key);
    if (!file || !file.exists) return null;
    return JSON.parse(await file.text()) as T;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown): void {
  try {
    const file = draftFile(key);
    if (!file) return;
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify(value));
  } catch {
    // best-effort
  }
}

export function removeDraft(key: string): void {
  try {
    const file = draftFile(key);
    if (file?.exists) file.delete();
  } catch {
    // best-effort
  }
}
