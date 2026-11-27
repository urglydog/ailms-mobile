import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/theme/colors';

/**
 * Thanh tiêu đề dùng chung cho mọi màn hình có tiêu đề. Tự chừa vùng an toàn phía trên (tai thỏ, Dynamic Island, thanh trạng thái)
 * và nằm TRONG luồng bố cục — nội dung màn hình luôn bắt đầu bên dưới thanh này, không bị chui xuống dưới như tiêu đề gốc trên iOS mới.
 */
export function AppHeader({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: COLORS.surfaceRaised,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lineSoft,
      }}
    >
      <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <View style={{ minWidth: 64, alignItems: 'flex-start' }}>{left}</View>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.ink }} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={{ minWidth: 64, alignItems: 'flex-end' }}>{right}</View>
      </View>
    </View>
  );
}
