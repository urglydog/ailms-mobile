import { Text, View } from 'react-native';
import { usePlayerTime } from '@/hooks/usePlayerTime';
import type { SubtitleSegment } from '@/types/lesson';
import { FONT_SIZE_PX, type SubtitleSettings } from '@/lib/subtitleSettings';

import { COLORS } from '@/lib/theme/colors';
function activeAt(segments: SubtitleSegment[], sec: number): SubtitleSegment | null {
  return segments.find((s) => sec >= s.startSec && sec < s.endSec) ?? null;
}

function hexToRgba(hex: string, alpha: number): string {
  const v = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}

interface Props {
  originalSubtitles: SubtitleSegment[];
  translatedSubtitles: SubtitleSegment[];
  player: { currentTime: number };
  settings: SubtitleSettings;
  /** Thanh điều khiển đang hiện → nâng phụ đề (vị trí dưới) lên để không che nút. */
  raised?: boolean;
}

/** Phụ đề phủ lên video (gốc + đã dịch). Đặt trong khung video `position: relative`. Lưu ý: ở chế độ
 * toàn màn hình native của `expo-video` lớp phủ này không hiện (chỉ thấy trong khung nhúng). */
export function SubtitleOverlay({ originalSubtitles, translatedSubtitles, player, settings, raised = true }: Props) {
  const currentSec = usePlayerTime(player, true);
  const original = settings.showOriginal ? activeAt(originalSubtitles, currentSec) : null;
  const translated = settings.showTranslated ? activeAt(translatedSubtitles, currentSec) : null;
  if (!original && !translated) return null;

  const fontSize = FONT_SIZE_PX[settings.fontSize];
  const line = (text: string, size: number) => (
    <Text
      style={{
        color: settings.textColor,
        fontSize: size,
        lineHeight: size * 1.35,
        textAlign: 'center',
        fontWeight: '600',
        backgroundColor: hexToRgba(COLORS.black, settings.backgroundOpacity / 100),
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
        ...(settings.outline ? { textShadowColor: COLORS.black, textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } } : null),
      }}
    >
      {text}
    </Text>
  );

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        alignItems: 'center',
        gap: 4,
        ...(settings.position === 'bottom' ? { bottom: raised ? 84 : 14 } : { top: 12 }),
      }}
    >
      {translated ? line(translated.text, fontSize) : null}
      {original ? line(original.text, Math.max(11, fontSize - 2)) : null}
    </View>
  );
}
