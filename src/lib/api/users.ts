import { api } from '@/lib/api/client';
import type { UserProfile } from '@/types/user';

export const usersApi = {
  getMe(): Promise<UserProfile> {
    return api.get<UserProfile>('/api/v1/users/me');
  },
};
