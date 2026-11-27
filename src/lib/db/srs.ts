/**
 * Lịch ôn flashcard phía máy — PHẢI khớp `FlashcardService.reviewCard` của BE để số hiển thị trên nút đánh giá
 * và lịch ôn khi đang offline giống kết quả server trả về sau khi đồng bộ:
 *  - điểm >= 3: lần đầu 10 phút (điểm 5: 3 ngày), lần hai 6 ngày, sau đó `max(1, round(max(1, ngày) * EF))` ngày;
 *  - điểm < 3: về lần đầu, 6 phút (điểm 2) hoặc 1 phút;
 *  - EF mới = EF + (0,1 - (5-q)(0,08 + (5-q)0,02)), tối thiểu 1,3, làm tròn 2 chữ số; EF cũ dùng để tính quãng nghỉ.
 */
const MIN_PER_DAY = 24 * 60;

export interface SrsState {
  intervalDays: number;
  repetitions: number;
  easiness: number;
}

export interface SrsResult extends SrsState {
  intervalMinutes: number;
}

export function computeReview(state: SrsState, quality: number): SrsResult {
  let repetitions = state.repetitions;
  let intervalMinutes: number;

  if (quality >= 3) {
    if (repetitions === 0) {
      intervalMinutes = quality === 5 ? 3 * MIN_PER_DAY : 10;
    } else if (repetitions === 1) {
      intervalMinutes = 6 * MIN_PER_DAY;
    } else {
      const days = Math.max(1, Math.round(Math.max(1, state.intervalDays) * state.easiness));
      intervalMinutes = days * MIN_PER_DAY;
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    intervalMinutes = quality === 2 ? 6 : 1;
  }

  const gap = 5 - quality;
  const rawEasiness = state.easiness + (0.1 - gap * (0.08 + gap * 0.02));
  const easiness = Math.round(Math.max(1.3, rawEasiness) * 100) / 100;

  return {
    repetitions,
    easiness,
    intervalDays: Math.max(0, Math.floor(intervalMinutes / MIN_PER_DAY)),
    intervalMinutes,
  };
}

/** Thời gian (mili giây) tới lần ôn kế tiếp nếu chọn mức `quality` — dùng ghi trên nút đánh giá. */
export function previewIntervalMs(state: SrsState, quality: number): number {
  return computeReview(state, quality).intervalMinutes * 60_000;
}

/** Server (container đặt `TZ=Asia/Ho_Chi_Minh`) trả giờ ôn dạng `2026-11-27T10:00:00.123456` KHÔNG kèm múi giờ → hiểu là giờ Việt Nam (UTC+7),
 * không phụ thuộc múi giờ của điện thoại. Giờ do máy tự ghi (`toISOString`) có hậu tố `Z` nên giữ nguyên. */
const SERVER_UTC_OFFSET = '+07:00';
const HAS_ZONE = /(Z|[+-]\d{2}:\d{2})$/;

/** Đổi chuỗi giờ ôn tiếp theo ra mili giây. Rỗng/sai → 0 (coi là đến hạn). */
export function parseReviewTime(value: string | null | undefined): number {
  if (!value) return 0;
  // Hermes chỉ chắc chắn đọc được tối đa 3 chữ số thập phân của giây.
  const trimmed = value.replace(/(\.\d{3})\d+/, '$1');
  const normalized = HAS_ZONE.test(trimmed) ? trimmed : `${trimmed}${SERVER_UTC_OFFSET}`;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : 0;
}

export function isCardDue(nextReviewAt: string | null | undefined, now: number = Date.now()): boolean {
  return parseReviewTime(nextReviewAt) <= now;
}

/** "10 phút", "3 giờ", "6 ngày" — cho nhãn dưới nút đánh giá. */
export function formatInterval(deltaMs: number): string {
  if (deltaMs < 3_600_000) return `${Math.max(1, Math.round(deltaMs / 60_000))} phút`;
  if (deltaMs < 86_400_000) return `${Math.round(deltaMs / 3_600_000)} giờ`;
  return `${Math.round(deltaMs / 86_400_000)} ngày`;
}
