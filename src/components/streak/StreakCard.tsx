import { Text, View } from 'react-native';

import type { Streak } from '@/types/streak';
import { COLORS } from '@/lib/theme/colors';

/** Tách từ `u/[userId].tsx` (port `fe/components/streak/StreakCard.tsx`) để dùng lại ở trang
 * `/community` mà không copy-paste JSX. Chỉ hiện của chính người đang đăng nhập — BE chỉ có
 * endpoint `/streak/me`, không có khái niệm xem streak người khác. */
export function StreakCard({ streak }: { streak: Streak }) {
  return (
    <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 22 }}>🔥</Text>
        <View>
          <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.ink }}>Chuỗi {streak.currentStreak} ngày</Text>
          <Text style={{ fontSize: 11.5, color: '#92400E' }}>Kỷ lục: {streak.longestStreak} ngày</Text>
        </View>
      </View>
      <Text style={{ fontSize: 11.5, color: '#92400E' }}>
        🧊 Còn {streak.freezesRemaining} lần đóng băng streak trong tháng này
      </Text>
    </View>
  );
}
