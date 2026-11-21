/**
 * Bảng màu app — đồng bộ với web (`fe/lib/theme/colors.ts`, bản UI v2 21/11/2026) qua
 * `doc/feat/uiux/design-tokens.json`. Nền/viền trung tính hơi ngả xanh; xanh lam CHỈ cho hành động
 * chính, liên kết, trạng thái chọn. Không ghi cứng mã hex ở nơi khác — luôn import COLORS từ đây.
 *
 * Chế độ tối (UI v2): `COLORS` là MỘT object dùng chung, `applyColorScheme()` ghi đè giá trị theo
 * chế độ hệ thống. Root layout gọi hàm này trước khi vẽ và vẽ lại cây màn hình khi chế độ đổi, nên
 * mọi `style={{ color: COLORS.ink }}` trong lúc render tự lấy đúng màu. Vì vậy KHÔNG lưu màu vào
 * hằng số cấp module (`const X = { color: COLORS.ink }`) — viết thành hàm để đọc lại mỗi lần render.
 *
 * `white`/`black` giữ nguyên ở cả 2 chế độ (chữ trên nút xanh, nền video). Nền thẻ dùng `surfaceRaised`.
 */
const LIGHT = {
  white: '#FFFFFF',
  black: '#000000',
  accent: '#1D62D6',
  accentDark: '#1853B6',
  ink: '#0E1A2B',
  inkMuted: '#4B5869',
  inkFaint: '#667286',
  line: '#DCE2EA',
  lineSoft: '#EDF1F6',
  lineDot: '#C5CEDA',
  surface: '#F6F8FB',
  surfaceRaised: '#FFFFFF',
  tint: '#EAF1FC',
  cyan: '#22D3EE',
  cyanInk: '#032B33',
  highlight: '#FFD84A',
  success: '#12753F',
  successInk: '#0F6B3D',
  successTint: '#E3F4EA',
  warning: '#D97706',
  warningInk: '#92400E',
  warningTint: '#FFF4E0',
  star: '#F59E0B',
  danger: '#C0302A',
  dangerInk: '#991B1B',
  dangerTint: '#FDECEC',
  info: '#1D62D6',
  infoTint: '#EAF1FC',
  ai: '#0A7586',
  aiTint: '#E2F4F7',
  streakBg: '#FFF1D6',
  streakInk: '#8A4B00',
  streakFlame: '#EA580C',
  /** Nền tối cố định (trình phát video, lớp phủ) ở mọi chế độ. */
  night: '#0E1A2B',
  /** Chữ trên nền `night`. */
  nightInk: '#E7ECF3',
  nightInkMuted: '#A6B1C1',
  /** Chữ báo lỗi trên nền `night`. */
  dangerOnNight: '#FF8A8A',
  overlay: 'rgba(14, 26, 43, 0.55)',
};

export type ColorToken = keyof typeof LIGHT;

/** Chế độ tối: nền sáng dần theo độ cao (surface < surfaceRaised < tint), nút xanh sáng hơn, chữ trắng trên nút. */
const DARK: Record<ColorToken, string> = {
  ...LIGHT,
  accent: '#2F64D0',
  accentDark: '#8AB5FF', // dùng làm CHỮ xanh trên nền tối (tab chọn, chip, link)
  ink: '#E7ECF3',
  inkMuted: '#A6B1C1',
  inkFaint: '#8592A5',
  line: '#283444',
  lineSoft: '#1A2330',
  lineDot: '#4A5870',
  surface: '#0C121B',
  surfaceRaised: '#131B26',
  tint: '#1A2840',
  success: '#2E9E5B',
  successInk: '#5FD08F',
  successTint: '#10301F',
  warning: '#E08A1A',
  warningInk: '#FFC66B',
  warningTint: '#3A2A0C',
  danger: '#E5484D',
  dangerInk: '#FF8A8A',
  dangerTint: '#3A1416',
  info: '#8AB5FF',
  infoTint: '#1A2840',
  ai: '#5DD3E2',
  aiTint: '#0E2C34',
  streakBg: '#3A2A0C',
  streakInk: '#FFC66B',
  streakFlame: '#FB923C',
  night: '#05080D',
  overlay: 'rgba(3, 7, 13, 0.7)',
};

export type ColorScheme = 'light' | 'dark';

/** Màu hiện hành — đọc trong lúc render. */
export const COLORS: Record<ColorToken, string> = { ...LIGHT };

let current: ColorScheme = 'light';

/** Đổi bộ màu theo chế độ. Trả về true nếu có thay đổi (để root layout vẽ lại cây màn hình). */
export function applyColorScheme(scheme: ColorScheme): boolean {
  if (scheme === current) return false;
  Object.assign(COLORS, scheme === 'dark' ? DARK : LIGHT);
  current = scheme;
  return true;
}

export const currentColorScheme = () => current;
