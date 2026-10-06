// ── Lỗi API (RFC 7807 ProblemDetail từ backend) ─────────────────
// Port nguyên trạng từ fe/types/domain.ts — giữ đúng shape để BE không cần đổi gì.
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  /** Mã lỗi ổn định của dự án, ví dụ QUOTA_EXCEEDED */
  code: string;
  timestamp: string;
  /** Chỉ có với lỗi Bean Validation */
  fieldErrors?: Record<string, string>;
}
