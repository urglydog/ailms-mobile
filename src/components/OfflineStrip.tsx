import { router, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';

import { useIsOnline } from '@/lib/network';
import { COLORS } from '@/lib/theme/colors';

/** Dải thông báo mỏng khi thiết bị mất mạng, dẫn tới màn ôn flashcard đã lưu trên máy. Không hiện khi có mạng. */
export function OfflineStrip() {
  const online = useIsOnline();
  if (online) return null;
  return (
    <Pressable
      onPress={() => router.push('/offline-flashcards' as Href)}
      accessibilityLabel="Mở ôn tập offline"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.streakBg }}
    >
      <WifiOff size={16} color={COLORS.streakInk} strokeWidth={2} />
      <Text style={{ flex: 1, color: COLORS.streakInk, fontSize: 12.5, fontWeight: '600' }}>
        Hiện không có kết nối mạng. Chạm để ôn các bộ thẻ đã lưu trên máy.
      </Text>
    </Pressable>
  );
}
