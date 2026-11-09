import { Pressable, Text, View } from 'react-native';
import { ApiError } from '@/lib/api/client';
import { COLORS } from '@/lib/theme/colors';

/** Hiện lý do lỗi thật từ BE + nút thử lại — dùng thay cho spinner vô hạn khi query lỗi. */
export function QueryError({ error, onRetry, compact }: { error: unknown; onRetry: () => void; compact?: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: compact ? 16 : 24, gap: 12, flex: compact ? undefined : 1 }}>
      <Text style={{ color: COLORS.ink, textAlign: 'center' }}>
        {error instanceof ApiError ? error.message : 'Không tải được dữ liệu. Kiểm tra kết nối mạng.'}
      </Text>
      <Pressable onPress={onRetry}>
        <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Thử lại</Text>
      </Pressable>
    </View>
  );
}
