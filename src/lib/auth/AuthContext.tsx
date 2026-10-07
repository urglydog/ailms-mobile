import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { authApi } from '@/lib/api/auth';
import { getAccessToken, getRefreshToken, setAuthFailureHandler } from '@/lib/api/client';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    getAccessToken().then((token) => setIsAuthenticated(!!token));
    // `client.ts` gọi callback này khi refresh token thất bại (401/403 không cứu được) —
    // đẩy người dùng về màn hình đăng nhập, tương đương `window.location.href = '/login'` bên web.
    setAuthFailureHandler(() => setIsAuthenticated(false));
  }, []);

  const login = async (data: LoginRequest) => {
    await authApi.login(data);
    setIsAuthenticated(true);
  };

  const loginWithGoogle = async () => {
    await signInWithGoogle();
    setIsAuthenticated(true);
  };

  const logout = async () => {
    const refreshToken = await getRefreshToken();
    await authApi.logout(refreshToken ?? '');
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
