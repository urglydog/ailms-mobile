import { api } from '@/lib/api/client';
import type { ActiveSession, PublicProfile, UpdateMyProfileRequest, UserProfile } from '@/types/user';

/** (08/10/2026) — port thêm đổi mật khẩu/quyền riêng tư/phiên đăng nhập/hồ sơ công khai, port
 * từ `fe/lib/api/users.ts` — mục #4 trong bảng ưu tiên UpComming_Plan.md. */
export const usersApi = {
  getMe(): Promise<UserProfile> {
    return api.get<UserProfile>('/api/v1/users/me');
  },

  updateMe(data: UpdateMyProfileRequest): Promise<UserProfile> {
    return api.put<UserProfile>('/api/v1/users/me', data);
  },

  changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return api.put<{ message: string }>('/api/v1/users/me/password', data);
  },

  updatePrivacy(data: { coursesPublic: boolean; wishlistPublic: boolean }): Promise<UserProfile> {
    return api.put<UserProfile>('/api/v1/users/me/privacy', data);
  },

  getSessions(): Promise<ActiveSession[]> {
    return api.get<ActiveSession[]>('/api/v1/users/me/sessions');
  },

  logoutAllOtherDevices(): Promise<void> {
    return api.post<void>('/api/v1/users/me/logout-all');
  },

  /** Public — không cần token (BE cũng cho phép gọi không JWT). */
  getPublicProfile(userId: number): Promise<PublicProfile> {
    return api.get<PublicProfile>(`/api/v1/users/${userId}/public-profile`);
  },
};
