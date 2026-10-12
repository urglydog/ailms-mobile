import { useQuery } from '@tanstack/react-query';

import { streakApi } from '@/lib/api/streak';

/** Port từ `fe/hooks/useStreak.ts` — gom query `streak` trước đây viết tay riêng trong
 * `u/[userId].tsx`, tái dùng thêm ở trang `/community`. */
export function useStreak(enabled: boolean = true) {
  return useQuery({
    queryKey: ['streak', 'me'],
    enabled,
    queryFn: () => streakApi.getMine(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
