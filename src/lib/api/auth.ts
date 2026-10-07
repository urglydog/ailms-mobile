import { api, clearTokens, setTokens } from '@/lib/api/client';
import type {
  ForgotPasswordRequest,
  GoogleMobileExchangeRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
  TokenResponse,
  VerifyOtpRequest,
} from '@/types/auth';

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

  /** Bước 1/2 đăng ký — chưa tạo tài khoản thật, chỉ gửi OTP về email. */
  register(data: RegisterRequest): Promise<MessageResponse> {
    return api.post<MessageResponse>('/api/v1/auth/register', data);
  },

  /** Bước 2/2 — xác thực OTP mới thật sự tạo tài khoản. Không trả token, vẫn phải đăng nhập lại. */
  verifyOtp(data: VerifyOtpRequest): Promise<MessageResponse> {
    return api.post<MessageResponse>('/api/v1/auth/register/verify', data);
  },

  forgotPassword(data: ForgotPasswordRequest): Promise<MessageResponse> {
    return api.post<MessageResponse>('/api/v1/auth/forgot-password', data);
  },

  /** Khớp bản Web — đặt lại mật khẩu xong BE trả token luôn (tự đăng nhập), không cần quay lại màn login. */
  async resetPassword(data: ResetPasswordRequest): Promise<TokenResponse> {
    const tokens = await api.post<TokenResponse>('/api/v1/auth/reset-password', data);
    await setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  },

  /**
   * Bước cuối đăng nhập Google trên mobile — đổi mã dùng-1-lần (app nhận được sau khi
   * `signInWithGoogle` mở trình duyệt xong) lấy JWT thật. Xem `lib/auth/googleAuth.ts`.
   */
  async exchangeGoogleCode(data: GoogleMobileExchangeRequest): Promise<TokenResponse> {
    const tokens = await api.post<TokenResponse>('/api/v1/auth/oauth/google/mobile-exchange', data);
    await setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  },
};
