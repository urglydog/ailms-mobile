import { api } from '@/lib/api/client';
import type { LeaderboardEntry, MyRanking } from '@/types/ranking';

export const rankingApi = {
  getLeaderboard: (limit: number = 5) =>
    api.get<LeaderboardEntry[]>(`/api/v1/ranking/leaderboard?limit=${limit}`),

  getMyRanking: () =>
    api.get<MyRanking>('/api/v1/ranking/me'),
};
