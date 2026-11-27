import { router, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { Flame } from 'lucide-react-native';

import { useStreak } from '@/hooks/useStreak';
import { COLORS } from '@/lib/theme/colors';

/** Chuỗi ngày học liên tiếp, gọn một dòng cạnh lời chào ở trang Khám phá (như biểu tượng ngọn lửa ở thanh trên của web). Bấm để xem chi tiết ở Cộng đồng. */
export function StreakChip({ enabled }: { enabled: boolean }) {
  const { data: streak } = useStreak(enabled);
  if (!streak) return null;
  const active = streak.currentStreak > 0;
  return (
    <Pressable
      onPress={() => router.push('/community' as Href)}
      accessibilityLabel={`Chuỗi ${streak.currentStreak} ngày học liên tiếp. Chạm để xem chi tiết`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? COLORS.warningTint : COLORS.surface,
        borderWidth: 1,
        borderColor: active ? COLORS.warning : COLORS.line,
      }}
    >
      <Flame size={16} color={active ? COLORS.warning : COLORS.inkFaint} strokeWidth={2.2} />
      <Text style={{ fontSize: 13, fontWeight: '800', color: active ? COLORS.warningInk : COLORS.inkMuted }}>{streak.currentStreak}</Text>
    </Pressable>
  );
}
