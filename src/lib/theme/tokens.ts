import type { TextStyle, ViewStyle } from 'react-native';
import { COLORS } from './colors';

/**
 * Token thiết kế dùng chung (UI v2) — cùng giá trị với web, nguồn: doc/feat/uiux/design-tokens.json.
 * Màn hình dùng các token này thay cho số "ma thuật" rải rác.
 */

/** Lưới 4 điểm. Lề ngang màn hình = `md` (16). */
export const SPACING = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

/** Bán kính có phân cấp: chip 6, nút/ô nhập 8, card 12, sheet/modal 16. */
export const RADIUS = { chip: 6, control: 8, card: 12, sheet: 16, pill: 999 } as const;

/** Thời lượng chuyển động (ms) và đường cong — dùng với Reanimated `withTiming`. */
export const MOTION = {
  fast: 120,
  base: 200,
  slow: 320,
  easeOut: [0.2, 0.8, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
} as const;

/** Vùng chạm tối thiểu theo HIG/Material. */
export const TOUCH = 44;

/** Thang chữ — chữ thân 15-16 trên mobile, tiêu đề đậm. */
export const TYPE = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: COLORS.ink, letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: COLORS.ink, letterSpacing: -0.2 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: COLORS.ink },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400', color: COLORS.ink },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: COLORS.ink },
  sub: { fontSize: 13, lineHeight: 18, fontWeight: '400', color: COLORS.inkMuted },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: COLORS.inkFaint },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: COLORS.inkFaint, letterSpacing: 0.6, textTransform: 'uppercase' },
} as const satisfies Record<string, TextStyle>;

/** Bóng nhẹ cho card nổi (chỉ dùng tiết chế). */
export const ELEVATION = {
  card: {
    shadowColor: COLORS.ink,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: COLORS.ink,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const satisfies Record<string, ViewStyle>;
