import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { applyColorScheme, COLORS } from '@/lib/theme/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { syncService } from '@/lib/db/syncService';
import { isOnlineNow, onReconnect, probeOnline } from '@/lib/network';
import { AppHeader } from '@/components/AppHeader';
import { BackButton } from '@/components/BackButton';
import { DiscoveryChat } from '@/components/chat/DiscoveryChat';

const queryClient = new QueryClient();

export default function RootLayout() {
  // Đồng bộ review flashcard làm offline mỗi khi app mở / quay lại foreground.
  // App khoá chiều dọc; chỉ màn bài học mở khoá để xoay ngang xem toàn màn hình (xem `lessons/[id].tsx`).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

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
            {/* Màn hình nào đặt `headerShown: true` sẽ dùng `AppHeader` (nằm trong luồng bố cục, chừa vùng an toàn phía trên) thay cho tiêu đề gốc. */}
            <Stack
              key={scheme}
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.surface },
                header: ({ options, route, back }) => (
                  <AppHeader
                    title={typeof options.headerTitle === 'string' ? options.headerTitle : (options.title ?? route.name)}
                    left={options.headerLeft ? options.headerLeft({ canGoBack: !!back, tintColor: COLORS.accent }) : back ? <BackButton /> : null}
                    right={options.headerRight ? options.headerRight({ canGoBack: !!back, tintColor: COLORS.accent }) : null}
                  />
                ),
              }}
            />
            <DiscoveryChat key={`chat-${scheme}`} />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
