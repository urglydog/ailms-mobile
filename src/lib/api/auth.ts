import { api, clearTokens, setTokens } from '@/lib/api/client';
import type { LoginRequest, TokenResponse } from '@/types/auth';

export const authApi = {
  async login(data: LoginRequest): Promise<TokenResponse> {
    const tokens = await api.post<TokenResponse>('/api/v1/auth/login', data);
    await setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  },

  /** Best-effort — lỗi (mất mạng, token đã hết hạn) không nên chặn việc đăng xuất phía client. */
  async logout(refreshToken: string): Promise<void> {
    try {
      await api.post('/api/v1/auth/logout', { refreshToken });
    } catch {
      // best-effort, xem docblock
    }
    await clearTokens();
  },
};
