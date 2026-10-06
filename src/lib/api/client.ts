/**
 * Client gọi API backend — port từ `fe/lib/api/client.ts`, giữ đúng API surface
 * (api.get/post/put/patch/delete, apiBlob, apiFormData, ApiError) để business logic/hook
 * viết cho web có thể tái dùng gần như nguyên trạng trên mobile.
 *
 * Khác biệt bắt buộc so với bản web:
 * - `localStorage` (sync) → `expo-secure-store` (async) để lưu JWT — an toàn hơn trên
 *   mobile (mã hoá bằng Keychain/Keystore của OS), nhưng mọi nơi đọc token phải `await`.
 * - Không có `window.location.href` để điều hướng về /login khi refresh thất bại — dùng
 *   callback `onAuthFailure` do root layout tự set (qua `setAuthFailureHandler`), tránh
 *   import trực tiếp expo-router vào file lib thuần logic này.
 * - Base URL đọc từ `EXPO_PUBLIC_API_URL` (quy ước bắt buộc của Expo: biến env dùng ở
 *   client phải có tiền tố `EXPO_PUBLIC_`, khác `NEXT_PUBLIC_` của Next.js).
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ProblemDetail } from '@/types/domain';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// `expo-secure-store` không có cài đặt cho web (gọi thẳng ném "getValueWithKeyAsync is not
// a function") — Keychain/Keystore vốn chỉ tồn tại trên iOS/Android. Trên web fallback về
// `localStorage` (kém an toàn hơn nhưng đây là nền tảng phụ lúc dev/test, không phải mục tiêu
// chính của app mobile). Giữ nguyên API async để chỗ gọi không cần biết đang chạy nền tảng nào.
const tokenStorage = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/** Lỗi API đã được chuẩn hoá — component bắt lỗi này thay vì đọc Response thô. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;

  constructor(problem: ProblemDetail) {
    super(problem.detail || problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
    this.code = problem.code ?? 'UNKNOWN';
    this.fieldErrors = problem.fieldErrors ?? {};
  }

  get isQuotaExceeded(): boolean {
    return this.status === 429;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

export function resolveBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('Thiếu EXPO_PUBLIC_API_URL trong .env — xem .env.example');
  }
  return url;
}

/** Root layout gọi 1 lần để nhận biết khi nào cần điều hướng về màn hình đăng nhập. */
let authFailureHandler: (() => void) | null = null;
export function setAuthFailureHandler(handler: () => void) {
  authFailureHandler = handler;
}

export async function getAccessToken(): Promise<string | null> {
  return tokenStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await tokenStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  await tokenStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await tokenStorage.deleteItem(ACCESS_TOKEN_KEY);
  await tokenStorage.deleteItem(REFRESH_TOKEN_KEY);
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: Error) => void;
}> = [];

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Fetch có tự refresh access token khi 401/403 — lõi dùng chung cho {@link request} và
 * {@link apiBlob}/{@link apiFormData}, cùng nguyên tắc với bản web: mọi request phải đi qua
 * đây, không tự viết `fetch` thô kèm `Authorization` tay (sẽ fail cứng khi token hết hạn).
 */
async function fetchWithRefresh(
  path: string,
  init: RequestInit,
  extraAuthHeaders: (token: string) => HeadersInit,
): Promise<Response> {
  const currentToken = await getAccessToken();

  const buildHeaders = (token: string | undefined) => ({
    ...init.headers,
    ...(token ? extraAuthHeaders(token) : {}),
  });

  let response = await fetch(`${resolveBaseUrl()}${path}`, {
    ...init,
    headers: buildHeaders(currentToken ?? undefined),
  });

  if (response.status === 401 || response.status === 403) {
    const refreshToken = await tokenStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      if (isRefreshing) {
        try {
          const newToken = await new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          response = await fetch(`${resolveBaseUrl()}${path}`, { ...init, headers: buildHeaders(newToken) });
        } catch {
          throw new ApiError(await parseProblem(response));
        }
      } else {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${resolveBaseUrl()}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            await setTokens(data.accessToken, data.refreshToken);
            processQueue(null, data.accessToken);

            response = await fetch(`${resolveBaseUrl()}${path}`, { ...init, headers: buildHeaders(data.accessToken) });
          } else {
            processQueue(new Error('Refresh failed'));
            await clearTokens();
            authFailureHandler?.();
          }
        } catch (err) {
          processQueue(err as Error);
          await clearTokens();
          authFailureHandler?.();
        } finally {
          isRefreshing = false;
        }
      }
    }
  }

  return response;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetchWithRefresh(
    path,
    {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    (t) => ({ Authorization: `Bearer ${t}` }),
  );

  if (!response.ok) {
    throw new ApiError(await parseProblem(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/** POST `FormData` (vd nộp bài kèm file) — CÙNG logic refresh-on-401 với {@link request}. */
export async function apiFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetchWithRefresh(path, { method: 'POST', body: formData }, (t) => ({
    Authorization: `Bearer ${t}`,
  }));
  if (!response.ok) {
    throw new ApiError(await parseProblem(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

/** Tải file nhị phân (PDF chứng chỉ, đề thi...) — CÙNG logic refresh-on-401 với {@link request}. */
export async function apiBlob(path: string): Promise<Blob> {
  const response = await fetchWithRefresh(path, {}, (t) => ({ Authorization: `Bearer ${t}` }));
  if (!response.ok) {
    throw new ApiError(await parseProblem(response));
  }
  return response.blob();
}

/** Cố gắng đọc ProblemDetail; nếu backend trả HTML/text thì tự dựng một cái tương đương. */
async function parseProblem(response: Response): Promise<ProblemDetail> {
  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return {
      type: 'about:blank',
      title: response.statusText,
      status: response.status,
      detail: `Yêu cầu thất bại với mã ${response.status}`,
      instance: response.url,
      code: 'NON_JSON_RESPONSE',
      timestamp: new Date().toISOString(),
    };
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
