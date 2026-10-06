import { api } from '@/lib/api/client';
import type { UpdateMyProfileRequest, UserProfile } from '@/types/user';

export const usersApi = {
  getMe(): Promise<UserProfile> {
    return api.get<UserProfile>('/api/v1/users/me');
  },

  updateMe(data: UpdateMyProfileRequest): Promise<UserProfile> {
    return api.put<UserProfile>('/api/v1/users/me', data);
  },
};
