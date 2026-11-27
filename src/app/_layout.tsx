import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { applyColorScheme, COLORS } from '@/lib/theme/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { syncService } from '@/lib/db/syncService';
import { isOnlineNow, onReconnect, probeOnline } from '@/lib/network';
import { DiscoveryChat } from '@/components/chat/DiscoveryChat';

const queryClient = new QueryClient();

export default function RootLayout() {
  // Đồng bộ review flashcard làm offline mỗi khi app mở / quay lại foreground.
  useEffect(() => {
    syncService.syncOfflineReviews().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncService.syncOfflineReviews().catch(() => {});
        if (!isOnlineNow()) void probeOnline();
      }
    });
    // Mạng trở lại → gửi ngay các lượt ôn đã làm offline (không chờ hết thời gian chờ thử lại).
    const offReconnect = onReconnect(() => {
      syncService.syncOfflineReviews({ force: true }).catch(() => {});
    });
    // Đang mất mạng thì cứ 15 giây hỏi thử server một lần để biết khi nào có mạng lại.
    const probeTimer = setInterval(() => {
      if (!isOnlineNow()) void probeOnline();
    }, 15_000);
    return () => {
      sub.remove();
      offReconnect();
      clearInterval(probeTimer);
    };
  }, []);

  // UI v2 (21/11/2026): bật chế độ tối theo hệ điều hành. Trước đây ép sáng vì màn hình dùng màu
  // hardcode; nay mọi màu đi qua COLORS nên chỉ cần đổi bộ màu TRƯỚC khi vẽ, và `key={scheme}` vẽ lại
  // cây màn hình khi người dùng đổi chế độ (màu đọc trong lúc render nên tự cập nhật).
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  applyColorScheme(scheme);
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      primary: COLORS.accent,
      background: COLORS.surface,
      card: COLORS.surfaceRaised,
      text: COLORS.ink,
      border: COLORS.line,
      notification: COLORS.danger,
    },
  };

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={theme}>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <Stack key={scheme} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.surface } }}>
              <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
            </Stack>
            <DiscoveryChat key={`chat-${scheme}`} />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
