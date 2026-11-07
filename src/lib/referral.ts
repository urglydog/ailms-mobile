import * as SecureStore from 'expo-secure-store';

/**
 * Chia doanh thu 2 mức — ghi lại mã giới thiệu của Giảng viên (`?ref=` trong link khóa học) để dùng
 * lúc thanh toán; port từ `fe/lib/referral.ts`. BE mới là nơi so khớp thật với `Course.referralCode`
 * (`PaymentService.resolveRevenueSource`), đây chỉ lưu giá trị thô đọc từ link.
 */
const STORAGE_KEY = 'lms.referralCodes';

type ReferralMap = Record<number, string>;

async function readAll(): Promise<ReferralMap> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReferralMap) : {};
  } catch {
    return {};
  }
}

export async function captureReferral(courseId: number, ref: string | null | undefined): Promise<void> {
  if (!ref) return;
  try {
    const all = await readAll();
    all[courseId] = ref;
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
}

export async function getReferralCode(courseId: number): Promise<string | undefined> {
  return (await readAll())[courseId];
}

export async function getReferralCodesFor(courseIds: number[]): Promise<Record<number, string>> {
  const all = await readAll();
  const result: Record<number, string> = {};
  for (const id of courseIds) {
    const code = all[id];
    if (code) result[id] = code;
  }
  return result;
}
