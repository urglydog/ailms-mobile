import { useEffect, useState } from 'react';

/** Thời gian phát hiện tại của 1 player (giây) — đọc định kỳ thay vì dựa vào sự kiện `timeUpdate`
 * (sự kiện này không đều/bị đứng trên một số nền tảng nên phụ đề bị "đóng băng"). Chỉ chạy khi
 * `active`, để màn hình không re-render vô ích. */
export function usePlayerTime(player: { currentTime: number }, active: boolean, intervalMs = 250): number {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      try {
        setSec(player.currentTime);
      } catch {
        // Player đã bị giải phóng — bỏ qua.
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [player, active, intervalMs]);
  return sec;
}

/** Trạng thái tắt tiếng của trình phát — đọc định kỳ để dùng chung cho cả video tải lên lẫn YouTube. */
export function usePlayerMuted(player: { muted: boolean }, intervalMs = 250): boolean {
  const [muted, setMuted] = useState(() => {
    try {
      return player.muted;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const id = setInterval(() => {
      try {
        setMuted(player.muted);
      } catch {
        // Player đã bị giải phóng — bỏ qua.
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [player, intervalMs]);
  return muted;
}

/** Video có THỰC SỰ đang chạy không: `player.playing` có thể báo true dù trình duyệt chặn tự phát (video đứng im), nên
 * chỉ coi là đang chạy khi thời gian thật sự tiến lên (cho 1,5s đầu để kịp khởi động). */
export function useReallyPlaying(player: { currentTime: number; playing: boolean }, intervalMs = 250): boolean {
  const [really, setReally] = useState(false);
  useEffect(() => {
    const mountedAt = Date.now();
    let lastTime = -1;
    let lastAdvanceAt = 0;
    const id = setInterval(() => {
      try {
        const t = player.currentTime;
        const now = Date.now();
        if (Math.abs(t - lastTime) > 0.01) lastAdvanceAt = now;
        lastTime = t;
        setReally(player.playing && (now - lastAdvanceAt < 900 || now - mountedAt < 1500));
      } catch {
        setReally(false);
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [player, intervalMs]);
  return really;
}
