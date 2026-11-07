import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { bundlesApi } from '@/lib/api/bundles';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { matchCartBundles, type CartBundleMatch } from '@/lib/bundles/matchCartBundles';

/**
 * Khớp combo (Bundle) với giỏ hàng thật — port từ `fe/hooks/useCartBundleMatches.ts`. Nguồn tính
 * duy nhất dùng chung giữa màn giỏ hàng và màn thanh toán giỏ hàng, phải khớp
 * `PaymentService.createBatchPayment` (pro-rated + rounding absorption).
 */
export function useCartBundleMatches(cartCourseIds: number[]): CartBundleMatch {
  const sortedIds = useMemo(() => [...cartCourseIds].sort((a, b) => a - b), [cartCourseIds]);
  const idsKey = sortedIds.join(',');

  const { data: enrolled } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => enrollmentsApi.getMine(),
  });
  const enrolledCourseIds = useMemo(() => enrolled?.map((e) => e.courseId) ?? [], [enrolled]);

  const bundlesQuery = useQuery({
    queryKey: ['bundles', 'for-cart', idsKey],
    queryFn: () => bundlesApi.getForCourses(sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(
    () => matchCartBundles({ cartCourseIds: sortedIds, enrolledCourseIds, bundles: bundlesQuery.data ?? [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey, enrolledCourseIds, bundlesQuery.data],
  );
}
