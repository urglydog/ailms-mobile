// Khớp `Invoice` của web (`fe/types/invoice.ts`) — chứng từ của chính người dùng đăng nhập (`GET /api/v1/invoices`).
export type InvoiceType = 'RECEIPT' | 'REFUND' | 'PAYOUT' | 'DEBT_RECEIPT' | 'STATEMENT';
export type InvoiceStatus = 'ISSUED' | 'VOIDED';

export interface Invoice {
  id: number;
  number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  issuedAt: string;
  relatedNumber: string | null;
  description: string | null;
  /** Mã nghiệp vụ chứng từ gắn vào: mã đơn (khớp `txnRef` của giao dịch), mã yêu cầu rút, mã thanh toán nợ, hoặc kỳ YYYYMM. */
  refs: string[];
}
