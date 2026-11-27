import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { authApi } from '@/lib/api/auth';
import { ApiError, clearTokens, getAccessToken, getRefreshToken, setAuthFailureHandler } from '@/lib/api/client';
import { usersApi } from '@/lib/api/users';
import { claimOfflineStorage, releaseOfflineStorage } from '@/lib/db/owner';
import { syncService } from '@/lib/db/syncService';
import { signInWithGoogle } from '@/lib/auth/googleAuth';
import type { LoginRequest } from '@/types/auth';

interface AuthContextValue {
  /** `null` = đang kiểm tra token đã lưu lúc mở app, chưa biết trạng thái. */
  isAuthenticated: boolean | null;
  login: (data: LoginRequest) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /** Đánh dấu đã đăng nhập khi token đã được lưu từ nơi khác (vd reset-password tự đăng nhập). */
  markAuthenticated: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Thời gian tối đa chờ server xác nhận phiên khi mở app; quá hạn (mạng chậm) thì cứ vào app, các màn hình sẽ tự kiểm tra tiếp. */
const SESSION_CHECK_TIMEOUT_MS = 5000;

/**
 * Kiểm tra phiên đăng nhập đã lưu khi mở app. Chỉ có token trong máy là chưa đủ — token có thể đã hết hạn/bị thu hồi, khi đó phải về màn đăng nhập
 * ngay thay vì vào trang chính rồi lỗi ở từng màn. Mất mạng, server chậm hoặc lỗi tạm thời thì GIỮ đăng nhập (để vẫn ôn flashcard offline được).
 */
async function restoreSession(): Promise<boolean> {
  if (!(await getAccessToken())) return false;
  const outcome = await Promise.race([
    usersApi.getMe().then(
      (me) => {
        void claimOfflineStorage(me.id).catch(() => {});
        return 'ok' as const;
      },
      (err: unknown) => err,
    ),
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), SESSION_CHECK_TIMEOUT_MS)),
  ]);
  // Làm mới token không được (server từ chối) → `client.ts` đã xoá token.
  if (!(await getAccessToken())) return false;
  // Token truy cập sai mà không có token làm mới để thử lại → không cứu được.
  if (outcome instanceof ApiError && outcome.status === 401 && !(await getRefreshToken())) {
    await clearTokens();
    return false;
  }
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // `client.ts` gọi callback này khi refresh token thất bại (401/403 không cứu được) —
    // đẩy người dùng về màn hình đăng nhập, tương đương `window.location.href = '/login'` bên web.
    setAuthFailureHandler(() => setIsAuthenticated(false));
    void restoreSession().then(setIsAuthenticated);
  }, []);

  /** Sau khi đăng nhập: gắn dữ liệu offline với tài khoản này (xoá dữ liệu của tài khoản khác nếu có). Lỗi ở bước này không chặn đăng nhập. */
  const claimStorage = async () => {
    try {
      const me = await usersApi.getMe();
      await claimOfflineStorage(me.id);
    } catch {
      // Bỏ qua — sẽ thử lại ở lần mở app sau.
    }
  };

  const login = async (data: LoginRequest) => {
    await authApi.login(data);
    await claimStorage();
    setIsAuthenticated(true);
  };

  const loginWithGoogle = async () => {
    await signInWithGoogle();
    await claimStorage();
    setIsAuthenticated(true);
  };

  const logout = async () => {
    const refreshToken = await getRefreshToken();
    // Gửi nốt các lượt ôn flashcard còn chờ (nếu có mạng) rồi mới xoá dữ liệu offline của tài khoản này khỏi máy.
    try {
      await syncService.syncOfflineReviews({ force: true });
    } catch {
      // Không gửi được (mất mạng) — vẫn đăng xuất.
    }
    await authApi.logout(refreshToken ?? '');
    await releaseOfflineStorage().catch(() => {});
    setIsAuthenticated(false);
  };

  const markAuthenticated = () => setIsAuthenticated(true);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, loginWithGoogle, logout, markAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong AuthProvider');
  return ctx;
}
