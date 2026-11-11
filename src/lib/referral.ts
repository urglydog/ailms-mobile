import * as SecureStore from 'expo-secure-store';

/**
 * Chia doanh thu 2 mức — ghi lại mã giới thiệu của Giảng viên (`?ref=` trong link khóa học) để dùng
 * lúc thanh toán; port từ `fe/lib/referral.ts`. BE mới là nơi so khớp thật với `Course.referralCode`
 * (`PaymentService.resolveRevenueSource`), đây chỉ lưu giá trị thô đọc từ link.
 * (11/11/2026) lưu kèm thời điểm, hết hạn sau 30 ngày (cùng quy tắc với web); link mới nhất thắng.
 */
const STORAGE_KEY = 'lms.referralCodes';

/** Hiệu lực của mã đã lưu: quá 30 ngày kể từ lần bấm link gần nhất thì không còn tính là đơn qua link. */
export const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredReferral {
  code: string;
  capturedAt: number;
}

/** Bản cũ lưu thẳng chuỗi mã (không có thời điểm) — vẫn đọc được. */
type ReferralMap = Record<number, StoredReferral | string>;

async function readAll(): Promise<ReferralMap> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReferralMap) : {};
  } catch {
    return {};
  }
}

function normalize(entry: StoredReferral | string | undefined, now: number): StoredReferral | null {
  if (!entry) return null;
  const stored: StoredReferral = typeof entry === 'string' ? { code: entry, capturedAt: now } : entry;
  if (!stored.code || typeof stored.capturedAt !== 'number') return null;
  return now - stored.capturedAt > REFERRAL_TTL_MS ? null : stored;
}

export async function captureReferral(courseId: number, ref: string | null | undefined): Promise<void> {
  if (!ref) return;
  try {
    const all = await readAll();
    all[courseId] = { code: ref, capturedAt: Date.now() };
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
}

export async function getReferralCode(courseId: number): Promise<string | undefined> {
  return normalize((await readAll())[courseId], Date.now())?.code;
}

export async function getReferralCodesFor(courseIds: number[]): Promise<Record<number, string>> {
  const all = await readAll();
  const now = Date.now();
  const result: Record<number, string> = {};
  for (const id of courseIds) {
    const entry = normalize(all[id], now);
    if (entry) result[id] = entry.code;
  }
  return result;
}
