// Khớp DisputeDto phía BE (`be/src/main/java/com/lms/payment/`) và `fe/types/domain.ts`.
export type DisputeStatus = 'OPEN' | 'RESOLVED_REFUNDED' | 'RESOLVED_REJECTED' | 'REOPENED';

export interface FileDisputeReq {
  paymentTxnRef: string;
  reason: string;
  description?: string;
  refundBankAccount?: string;
  termsAccepted: boolean;
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
}

/** File đính kèm chọn từ thư viện — React Native FormData nhận {uri, name, type}. */
export interface PickedEvidence {
  uri: string;
  name: string;
  mimeType: string;
}
