import { Image, Text, View, type DimensionValue } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { COLORS } from '@/lib/theme/colors';

/**
 * Ảnh bìa khóa học dùng chung (UI v2). Khóa chưa có ảnh: thay ô xám trống bằng nền tint + icon sách
 * + chữ cái đầu tiêu đề — vẫn nhận ra là "thẻ khóa học", không trông như ảnh tải lỗi.
 */
export function CourseThumb({
  url,
  title,
  width = '100%',
  height,
  radius = 0,
}: {
  url: string | null | undefined;
  title?: string;
  width?: DimensionValue;
  height: DimensionValue;
  radius?: number;
}) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width, height, borderRadius: radius, backgroundColor: COLORS.lineSoft }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  const initial = title?.replace(/^\[[^\]]*\]\s*/, '').trim().charAt(0).toUpperCase();
  return (
    <View
      accessible={false}
      style={{ width, height, borderRadius: radius, backgroundColor: COLORS.tint, alignItems: 'center', justifyContent: 'center', gap: 2 }}
    >
      <BookOpen size={22} color={COLORS.accent} strokeWidth={1.8} />
      {initial ? <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.accentDark }}>{initial}</Text> : null}
    </View>
  );
}
