import { useQuery } from '@tanstack/react-query';

import { rankingApi } from '@/lib/api/ranking';

/** Port từ `fe/hooks/useRanking.ts` — gom logic `useQuery` trước đây viết tay riêng lẻ trong
 * `RankingBanner.tsx` và trang `/community`, tránh lệch query key giữa 2 nơi. */
export function useLeaderboard(limit: number = 5) {
  return useQuery({
    queryKey: ['ranking', 'leaderboard', limit],
    queryFn: () => rankingApi.getLeaderboard(limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyRanking(enabled: boolean) {
  return useQuery({
    queryKey: ['ranking', 'me'],
    queryFn: () => rankingApi.getMyRanking(),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
