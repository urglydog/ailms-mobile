// Khớp PaymentDto / PaymentStatus phía BE (`be/src/main/java/com/lms/payment/`).
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

export interface CreatePaymentRequest {
  courseId: number;
  paymentMethod: 'PAYOS';
  billingName?: string;
  billingPhone?: string;
  couponCode?: string;
  courseAccessPassword?: string;
  referralCode?: string;
}

export interface CreateBatchPaymentReq {
  courseIds: number[];
  paymentMethod: 'PAYOS';
  billingName?: string;
  billingPhone?: string;
  couponCode?: string;
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
}
