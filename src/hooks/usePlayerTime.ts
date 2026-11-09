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
