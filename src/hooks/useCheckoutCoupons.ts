import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/lib/api/client';
import { couponsApi } from '@/lib/api/coupons';
import type { AvailableCoupon, CouponPriceRes } from '@/types/payment';

/**
 * Khuyến mãi ở màn thanh toán — học viên TỰ CHỌN (BE không áp ngầm khi `manualCoupon=true`), giống web
 * (`app/(student)/checkout/*`). `selectedId`: undefined = chưa quyết định (sẽ chọn sẵn mức giảm nhiều
 * nhất khi tải xong), null = chủ động không dùng.
 */
export function useCheckoutCoupons(courseIds: number[]) {
  const idsKey = [...courseIds].sort((a, b) => a - b).join(',');
  const [available, setAvailable] = useState<AvailableCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null | undefined>(undefined);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [prices, setPrices] = useState<Map<number, CouponPriceRes>>(new Map());
  const [applying, setApplying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    couponsApi
      .available(idsKey.split(',').map(Number))
      .then((list) => {
        if (cancelled) return;
        setAvailable(list);
        setSelectedId((prev) => (prev === undefined ? (list[0]?.id ?? null) : prev));
      })
      .catch(() => {
        if (!cancelled) setSelectedId((prev) => (prev === undefined ? null : prev));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  // Tính lại giá từng khóa mỗi khi đổi khuyến mãi đã chọn hoặc mã nhập tay.
  useEffect(() => {
    if (!idsKey || selectedId === undefined) return;
    let cancelled = false;
    couponsApi
      .previewManyManual(idsKey.split(',').map(Number), selectedId ?? undefined, appliedCode ?? undefined)
      .then((m) => {
        if (!cancelled) setPrices(m);
      })
      .catch(() => {
        if (!cancelled) setPrices(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey, selectedId, appliedCode]);

  const applyCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed || !idsKey) return;
      setApplying(true);
      setCodeError(null);
      try {
        const results = await couponsApi.previewManyManual(
          idsKey.split(',').map(Number),
          selectedId ?? undefined,
          trimmed,
        );
        if (![...results.values()].some((r) => r.enteredCodeValid)) {
          setCodeError('Mã giảm giá không áp dụng được cho khóa đã chọn.');
          return;
        }
        setAppliedCode(trimmed);
      } catch (err) {
        setCodeError(err instanceof ApiError ? err.message : 'Không áp dụng được mã giảm giá, thử lại sau.');
      } finally {
        setApplying(false);
      }
    },
    [idsKey, selectedId],
  );

  const removeCode = useCallback(() => {
    setAppliedCode(null);
    setCodeError(null);
  }, []);

  return {
    available,
    loading,
    selectedId,
    setSelectedId,
    appliedCode,
    prices,
    applying,
    codeError,
    applyCode,
    removeCode,
    /** Dùng khi gửi lên BE: luôn chế độ chọn thủ công. */
    paymentCouponParams: {
      couponId: selectedId ?? undefined,
      manualCoupon: true as const,
      couponCode: appliedCode ?? undefined,
    },
  };
}
