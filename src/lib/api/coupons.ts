import { api } from '@/lib/api/client';
import type { AvailableCoupon, CouponPriceRes } from '@/types/payment';

export const couponsApi = {
  /** Coupon học viên có thể chọn cho các khóa đang thanh toán, giảm nhiều nhất lên đầu. */
  available(courseIds: number[]): Promise<AvailableCoupon[]> {
    return api.get<AvailableCoupon[]>(`/api/v1/coupons/available?courseIds=${courseIds.join(',')}`);
  },

  /** Xem trước giá 1 khóa ở chế độ chọn thủ công (BE KHÔNG tự áp coupon autoApply). */
  previewManual(courseId: number, couponId?: number, code?: string): Promise<CouponPriceRes> {
    return api.post<CouponPriceRes>('/api/v1/coupons/preview', {
      courseId,
      code: code || undefined,
      couponId,
      manualCoupon: true,
    });
  },

  /** Giỏ nhiều khóa: preview từng khóa song song với CÙNG coupon đã chọn + mã nhập tay. */
  async previewManyManual(courseIds: number[], couponId?: number, code?: string): Promise<Map<number, CouponPriceRes>> {
    const entries = await Promise.all(
      courseIds.map(async (id) => [id, await couponsApi.previewManual(id, couponId, code)] as const),
    );
    return new Map(entries);
  },
};
