/**
 * Đăng nhập Google trên mobile — KHÔNG dùng `expo-auth-session/providers/google` (đã
 * deprecated) hay native Google Sign-In SDK (cần EAS Dev Client, không chạy được trong Expo Go
 * vì Expo Go không tự custom được URL scheme để Google redirect thẳng về app).
 *
 * Thay vào đó: BE đứng giữa nhận redirect từ Google qua HTTPS (không qua custom scheme), đổi
 * `code` lấy id_token bằng client secret (app không bao giờ cầm secret), rồi bounce ngược về
 * app qua `exp://...` (scheme riêng của Expo Go — thứ duy nhất `WebBrowser.openAuthSessionAsync`
 * bắt được) kèm 1 mã dùng-1-lần. Xem `be/src/main/java/com/lms/auth/service/AuthService.java`
 * (`handleGoogleMobileCallback`/`exchangeGoogleMobileCode`) cho nửa còn lại của luồng.
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { authApi } from '@/lib/api/auth';
import { resolveBaseUrl } from '@/lib/api/client';
import type { TokenResponse } from '@/types/auth';

export async function signInWithGoogle(): Promise<TokenResponse> {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('Thiếu EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID trong .env');
  }

  // Trong Expo Go: exp://<host>:<port>/--/google-auth-return. Trong dev build/app thật:
  // mobile://google-auth-return (scheme khai báo ở app.json) — WebBrowser tự chọn đúng cái
  // đang chạy, không cần phân biệt thủ công.
  const appReturnUrl = Linking.createURL('google-auth-return');

  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${resolveBaseUrl()}/api/v1/auth/oauth/google/mobile-callback`,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      // BE chỉ dùng state để biết redirect app về đâu — xem lý do không cần CSRF token thật
      // trong docblock của `handleGoogleMobileCallback` phía BE.
      state: appReturnUrl,
    }).toString();

  const result = await WebBrowser.openAuthSessionAsync(authUrl, appReturnUrl);

  if (result.type !== 'success' || !result.url) {
    throw new Error('Đăng nhập Google đã bị huỷ.');
  }

  const queryIndex = result.url.indexOf('?');
  const query = new URLSearchParams(queryIndex >= 0 ? result.url.slice(queryIndex + 1) : '');
  const exchangeCode = query.get('code');
  if (!exchangeCode) {
    throw new Error('Không nhận được mã xác thực từ máy chủ sau khi đăng nhập Google.');
  }

  return authApi.exchangeGoogleCode({ code: exchangeCode });
}
