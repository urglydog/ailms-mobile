import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { getAccessToken } from '@/lib/api/client';
import { quizzesApi, RecordingUploadError } from '@/lib/api/quizzes';

/**
 * Hàng đợi bền vững cho video giám sát phòng thi: video được chép vào thư mục lưu trữ của ứng dụng cùng một tệp mô tả nhỏ, chỉ xoá sau khi máy chủ
 * xác nhận đã nhận. Nếu học viên đóng ứng dụng, mất mạng hay tải lỗi giữa chừng, lần mở ứng dụng/quay lại có mạng tiếp theo sẽ tự tải lại.
 * Mọi thao tác bọc try/catch: lỗi ở hàng đợi không được ảnh hưởng đến việc thi hay mở ứng dụng.
 */

interface PendingRecording {
  attemptId: number;
  durationSec: number;
  createdAt: number;
  uri: string;
}

export interface RecordingProgress {
  attemptId: number;
  sentBytes: number;
  totalBytes: number;
}

export interface FlushResult {
  /** `none`: không có gì để tải · `done`: đã tải xong hết · `failed`: còn bản ghi chưa tải được (sẽ tự thử lại sau). */
  state: 'none' | 'done' | 'failed';
  error: string;
}

/** Bản ghi quá hạn này (ms) thì bỏ: giảng viên không còn xem lại nữa và tránh chiếm dung lượng máy mãi. */
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const RETRY_DELAYS_MS = [0, 5_000, 15_000];

function queueDir(): Directory | null {
  if (Platform.OS === 'web') return null;
  const dir = new Directory(Paths.document, 'proctoring-pending');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function metaFile(dir: Directory, attemptId: number): File {
  return new File(dir, `attempt-${attemptId}.json`);
}

async function readAll(dir: Directory): Promise<PendingRecording[]> {
  const out: PendingRecording[] = [];
  for (const entry of dir.list()) {
    if (!(entry instanceof File) || !entry.name.endsWith('.json')) continue;
    try {
      const meta = JSON.parse(await entry.text()) as PendingRecording;
      if (Number.isFinite(meta.attemptId) && typeof meta.uri === 'string') out.push(meta);
    } catch {
      // tệp mô tả hỏng: bỏ qua
    }
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

function remove(dir: Directory, meta: PendingRecording): void {
  try {
    const video = new File(meta.uri);
    if (video.exists) video.delete();
  } catch {
    // bỏ qua
  }
  try {
    const m = metaFile(dir, meta.attemptId);
    if (m.exists) m.delete();
  } catch {
    // bỏ qua
  }
}

let running: Promise<FlushResult> | null = null;
/** Có video mới được thêm vào lúc đang tải → chạy thêm một vòng cho đủ. */
let needsRerun = false;

const listeners = new Set<(p: RecordingProgress) => void>();

/** Đăng ký nhận tiến độ tải (để hiện thanh tiến độ). Trả về hàm huỷ đăng ký. */
export function subscribeRecordingProgress(fn: (p: RecordingProgress) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Lưu video vừa quay vào hàng đợi. Nếu không chép được (hết dung lượng...) thì dùng luôn tệp gốc để vẫn tải được trong lần này. */
export function enqueueRecording(attemptId: number, srcUri: string, durationSec: number): void {
  try {
    const dir = queueDir();
    if (!dir) return;
    let uri = srcUri;
    try {
      const target = new File(dir, `attempt-${attemptId}.mp4`);
      if (target.exists) target.delete();
      new File(srcUri).copy(target);
      uri = target.uri;
    } catch {
      uri = srcUri;
    }
    const meta: PendingRecording = { attemptId, durationSec, createdAt: Date.now(), uri };
    const file = metaFile(dir, attemptId);
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify(meta));
    needsRerun = true;
  } catch {
    // best-effort
  }
}

/** Mã lỗi mà thử lại cũng không khác: bỏ bản ghi thay vì thử mãi. 401/408/429 là tạm thời nên giữ. */
function isPermanent(status: number): boolean {
  return status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429;
}

async function runPass(attempts: number): Promise<FlushResult> {
  const dir = queueDir();
  if (!dir) return { state: 'none', error: '' };
  let items = await readAll(dir);
  if (items.length === 0) return { state: 'none', error: '' };
  if (!(await getAccessToken())) return { state: 'failed', error: '' };

  let error = '';
  let remaining = 0;
  items = items.filter((m) => {
    if (Date.now() - m.createdAt > MAX_AGE_MS) {
      remove(dir, m);
      return false;
    }
    return true;
  });
  for (const meta of items) {
    let uploaded = false;
    for (let i = 0; i < Math.min(attempts, RETRY_DELAYS_MS.length); i++) {
      if (RETRY_DELAYS_MS[i]) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[i]));
      try {
        await quizzesApi.uploadRecording(meta.attemptId, meta.uri, meta.durationSec, (sent, total) => {
          listeners.forEach((fn) => fn({ attemptId: meta.attemptId, sentBytes: sent, totalBytes: total }));
        });
        remove(dir, meta);
        uploaded = true;
        break;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        if (err instanceof RecordingUploadError && isPermanent(err.status)) {
          remove(dir, meta);
          uploaded = true; // không còn gì để thử lại
          break;
        }
      }
    }
    if (!uploaded) remaining += 1;
  }
  return { state: remaining > 0 ? 'failed' : 'done', error };
}

/**
 * Tải mọi video giám sát đang chờ. Gọi lại khi đang chạy thì dùng chung lượt chạy đó (và tự chạy thêm một vòng nếu có video mới được thêm vào lúc đó).
 * `attempts`: số lần thử mỗi video (trong màn thi: 3; khi mở ứng dụng/có mạng lại: 1 vì lần kích hoạt kế tiếp sẽ thử lại).
 */
export function flushRecordings(attempts = 1): Promise<FlushResult> {
  if (running) return running;
  running = (async () => {
    try {
      let result: FlushResult;
      do {
        needsRerun = false;
        result = await runPass(attempts);
      } while (needsRerun);
      return result;
    } catch (err) {
      return { state: 'failed' as const, error: err instanceof Error ? err.message : String(err) };
    } finally {
      running = null;
    }
  })();
  return running;
}
