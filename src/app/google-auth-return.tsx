import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * Chỉ thật sự được dùng khi test bằng `expo start --web` (xem `lib/auth/googleAuth.ts`) — trên
 * web, `WebBrowser.openAuthSessionAsync` không tự biết popup đã xong như native (ASWebAuthenticationSession
 * tự chặn), phải có đúng trang này gọi `maybeCompleteAuthSession()` để đóng popup + báo kết quả
 * về cửa sổ chính. Trên Expo Go/app thật, BE redirect thẳng về `exp://`/`mobile://` nên route
 * này không bao giờ thật sự được mở.
 */
export default function GoogleAuthReturnScreen() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator />
      <Text>Đang hoàn tất đăng nhập...</Text>
    </View>
  );
}
