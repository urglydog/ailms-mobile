import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { syncService } from '@/lib/db/syncService';
import { DiscoveryChat } from '@/components/chat/DiscoveryChat';

const queryClient = new QueryClient();

export default function RootLayout() {
  // Đồng bộ review flashcard làm offline mỗi khi app mở / quay lại foreground.
  useEffect(() => {
    syncService.syncOfflineReviews().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncService.syncOfflineReviews().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  // Ép theme sáng (DefaultTheme) bất kể chế độ tối của hệ điều hành — toàn bộ màn hình hiện tại
  // (login, register, courses...) dùng màu chữ/nền literal hardcode kiểu "sáng" (vd text đen,
  // không set backgroundColor), không có style riêng cho dark mode. Để DarkTheme tự bật theo OS
  // khiến nền chuyển đen còn chữ/placeholder vẫn đen -> toàn bộ text biến mất (bug thật đã gặp
  // trên máy tối màu). Khi nào các màn hình được thiết kế màu theo theme thì mới bật lại tự động.
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
            </Stack>
            <DiscoveryChat />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
