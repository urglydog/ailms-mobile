import { useSyncExternalStore } from 'react';

/**
 * Trạng thái kết nối suy ra từ kết quả các lần gọi server thật (không cần thư viện NetInfo):
 * gọi được → có mạng; lỗi kết nối (fetch ném lỗi) → mất mạng. Khi đang mất mạng, app tự thử lại nhẹ nhàng
 * (`probeOnline`) để biết khi nào có mạng trở lại và đồng bộ các lượt ôn flashcard đã làm offline.
 * Không import từ `lib/api/client.ts` (client.ts import file này) nên đọc địa chỉ server trực tiếp từ env.
 */
let online = true;
const stateListeners = new Set<() => void>();
const reconnectListeners = new Set<() => void>();

function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  stateListeners.forEach((l) => l());
  if (next) reconnectListeners.forEach((l) => l());
}

export function isOnlineNow(): boolean {
  return online;
}

export function reportNetworkOk(): void {
  setOnline(true);
}

export function reportNetworkError(): void {
  setOnline(false);
}

function subscribeOnline(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

/** Đăng ký hàm chạy mỗi khi mạng trở lại (từ mất mạng sang có mạng). Trả về hàm huỷ đăng ký. */
export function onReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  return () => {
    reconnectListeners.delete(listener);
  };
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, isOnlineNow, isOnlineNow);
}

/** Thử gọi server một lần (có giới hạn thời gian) để biết còn mất mạng không. Chỉ cần nhận được phản hồi là có mạng. */
export async function probeOnline(timeoutMs = 6000): Promise<boolean> {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) return online;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${base}/api/v1/categories`, { method: 'GET', signal: controller.signal });
    reportNetworkOk();
    return true;
  } catch {
    reportNetworkError();
    return false;
  } finally {
    clearTimeout(timer);
  }
}
