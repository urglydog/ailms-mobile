import * as SecureStore from 'expo-secure-store';

import { COLORS } from '@/lib/theme/colors';
/** Tuỳ chọn hiển thị phụ đề của TỪNG NGƯỜI XEM (không gắn bài học) — bản rút gọn của
 * `fe/components/player/subtitleStyle.ts` (web có kéo-thả vị trí, ở mobile chỉ chọn trên/dưới). */
export type SubtitleFontSize = 'sm' | 'md' | 'lg' | 'xl';

export interface SubtitleSettings {
  showOriginal: boolean;
  showTranslated: boolean;
  fontSize: SubtitleFontSize;
  textColor: string;
  /** 0-100 — 0 = không nền. */
  backgroundOpacity: number;
  outline: boolean;
  position: 'bottom' | 'top';
}

export const FONT_SIZE_PX: Record<SubtitleFontSize, number> = { sm: 12, md: 14, lg: 17, xl: 21 };
export const COLOR_SWATCHES = [COLORS.white, COLORS.highlight, COLORS.cyan, COLORS.success, COLORS.dangerOnNight];

// Mặc định KHÔNG bật phụ đề nào (giống web): người xem bấm "Gốc" hoặc "Dịch" để bật từng loại — bật một loại thì chỉ hiện loại đó,
// bật thêm loại kia mới hiện cả hai.
export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  showOriginal: false,
  showTranslated: false,
  fontSize: 'md',
  textColor: COLORS.white,
  backgroundOpacity: 70,
  outline: false,
  position: 'bottom',
};

const KEY = 'lms_subtitle_settings';

export async function loadSubtitleSettings(): Promise<SubtitleSettings> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return DEFAULT_SUBTITLE_SETTINGS;
    // Kiểu chữ/màu/vị trí được nhớ giữa các lần xem; việc bật phụ đề nào thì tính theo từng lần xem nên luôn bắt đầu ở trạng thái tắt.
    return { ...DEFAULT_SUBTITLE_SETTINGS, ...(JSON.parse(raw) as Partial<SubtitleSettings>), showOriginal: false, showTranslated: false };
  } catch {
    return DEFAULT_SUBTITLE_SETTINGS;
  }
}

export function saveSubtitleSettings(settings: SubtitleSettings): void {
  SecureStore.setItemAsync(KEY, JSON.stringify(settings)).catch(() => {
    // Best effort — không lưu được thì lần sau về mặc định.
  });
}
