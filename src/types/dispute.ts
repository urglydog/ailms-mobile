// Khớp DisputeDto phía BE (`be/src/main/java/com/lms/payment/`) và `fe/types/domain.ts`.
export type DisputeStatus = 'OPEN' | 'RESOLVED_REFUNDED' | 'RESOLVED_REJECTED' | 'REOPENED';

/** Lý do chuẩn hóa (11/11/2026). Bản app cũ không gửi → BE hiểu là OTHER. */
export type DisputeCategory =
  | 'CHANGED_MIND' | 'CONTENT_MISMATCH' | 'TECHNICAL_ERROR' | 'DOUBLE_CHARGE' | 'NOT_ENROLLED' | 'OTHER';
export type InstructorDecision = 'AGREE_REFUND' | 'OBJECT' | 'NO_RESPONSE';
/** null = chưa duyệt hoàn tiền; PENDING_TRANSFER = đã duyệt, chờ chuyển khoản; TRANSFERRED = đã chuyển. */
export type RefundTransferStatus = 'PENDING_TRANSFER' | 'TRANSFERRED';

export interface FileDisputeReq {
  paymentTxnRef: string;
  reason: string;
  description?: string;
  refundBankAccount?: string;
  termsAccepted: boolean;
  category?: DisputeCategory;
}

export interface DisputeAttachment {
  id: number;
  fileUrl: string;
  fileType: string;
}

export interface DisputeRes {
  id: number;
  paymentTxnRef: string;
  courseTitle: string;
  amount: number;
  reason: string;
  description: string | null;
  status: DisputeStatus;
  filedByEmail: string;
  createdAt: string;
  attachments: DisputeAttachment[];
  resolvedAt: string | null;
  reopenedAt: string | null;
  /** Các trường dưới đây chỉ có khi BE đã bản mới (11/11/2026) — đều optional để app chạy với BE cũ. */
  adminNote?: string | null;
  category?: DisputeCategory | null;
  instructorDecision?: InstructorDecision | null;
  refundTransferStatus?: RefundTransferStatus | null;
}

/** File đính kèm chọn từ thư viện — React Native FormData nhận {uri, name, type}. */
export interface PickedEvidence {
  uri: string;
  name: string;
  mimeType: string;
}
