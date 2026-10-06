import { api } from '@/lib/api/client';
import type { Streak } from '@/types/streak';

export const streakApi = {
  getMine(): Promise<Streak> {
    return api.get<Streak>('/api/v1/streak/me');
  },
};
