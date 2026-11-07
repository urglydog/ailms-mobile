// Khớp PaymentDto / PaymentStatus phía BE (`be/src/main/java/com/lms/payment/`).
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

export interface CreatePaymentRequest {
  courseId: number;
  paymentMethod: 'PAYOS';
  billingName?: string;
  billingPhone?: string;
  couponCode?: string;
  /** Học viên tự chọn coupon trong danh sách ở màn thanh toán (cần `manualCoupon: true`). */
  couponId?: number;
  manualCoupon?: boolean;
  courseAccessPassword?: string;
  referralCode?: string;
}

export interface CreateBatchPaymentReq {
  courseIds: number[];
  paymentMethod: 'PAYOS';
  billingName?: string;
  billingPhone?: string;
  couponCode?: string;
  couponId?: number;
  manualCoupon?: boolean;
  referralCodes?: Record<number, string>;
  bundleIds?: number[];
}

export interface PaymentUrlResponse {
  paymentUrl: string;
  /** Mobile không có trang web nào để landing sau khi thanh toán — poll `/payments/mine` lọc
   * theo field này để biết khi nào webhook PayOS đã xác nhận xong. Xem `lib/payment/payosCheckout.ts`. */
  txnRef: string;
}

export interface PaymentRecord {
  txnRef: string;
  amount: number;
  paymentMethod: string;
  status: PaymentStatus;
  paidAt: string | null;
  courseTitle: string;
  gatewayTxnNo: string | null;
  billingName: string | null;
  billingPhone: string | null;
  originalAmount: number | null;
  discountAmount: number | null;
  couponCode: string | null;
  /** Mã nhóm khi thanh toán giỏ hàng (null với đơn lẻ) — khớp `PaymentUrlResponse.txnRef` của giỏ hàng. */
  orderGroupRef?: string | null;
}

/** Coupon học viên có thể chọn ở màn thanh toán (giảm nhiều nhất xếp trước) — khớp `CouponDto.AvailableRes`. */
export interface AvailableCoupon {
  id: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  scopeType: string;
  endAt: string;
  savings: number;
  applicableCourseIds: number[];
}

/** Khớp `CouponDto.PriceRes`. */
export interface CouponPriceRes {
  originalPrice: number;
  finalPrice: number;
  discountPercent: number | null;
  appliedCouponCode: string | null;
  enteredCodeValid: boolean;
}
