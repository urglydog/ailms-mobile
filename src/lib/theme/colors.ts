/**
 * Bảng màu app — đồng bộ với web (`fe/lib/theme/colors.ts`, bản UI v2 21/11/2026) qua
 * `doc/feat/uiux/design-tokens.json`. Nền/viền trung tính hơi ngả xanh; xanh lam CHỈ cho hành động
 * chính, liên kết, trạng thái chọn. Không ghi cứng mã hex ở nơi khác — luôn import COLORS từ đây.
 * Mọi cặp chữ/nền đạt tương phản WCAG AA (kiểm tra ở web: `lib/theme/colors.test.ts`).
 */
export const COLORS = {
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
} as const;

export type ColorToken = keyof typeof COLORS;
