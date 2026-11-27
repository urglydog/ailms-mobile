import { api, apiFormData } from '@/lib/api/client';
import type { DisputeRes, FileDisputeReq, PayoutBank, PickedEvidence, UpdateRefundAccountReq } from '@/types/dispute';

export const disputesApi = {
  /** multipart: field "request" là JSON, "files" (0-5) là minh chứng — khớp web `disputesApi.file`. */
  file(req: FileDisputeReq, files: PickedEvidence[] = []): Promise<DisputeRes> {
    const formData = new FormData();
    // RN FormData chấp nhận {uri,name,type} cho file; phần JSON gửi dưới dạng part có content-type JSON.
    formData.append('request', { string: JSON.stringify(req), type: 'application/json' } as unknown as Blob);
    files.forEach((f) => formData.append('files', { uri: f.uri, name: f.name, type: f.mimeType } as unknown as Blob));
    return apiFormData<DisputeRes>('/api/v1/disputes', formData);
  },

  listMine(): Promise<DisputeRes[]> {
    return api.get<DisputeRes[]>('/api/v1/disputes/mine');
  },

  reopen(id: number, reopenReason: string): Promise<DisputeRes> {
    return api.post<DisputeRes>(`/api/v1/disputes/mine/${id}/reopen`, { reopenReason });
  },

  /** Danh sách ngân hàng cho form tài khoản nhận hoàn tiền (chọn từ danh sách, không gõ tự do). */
  banks(): Promise<PayoutBank[]> {
    return api.get<PayoutBank[]>('/api/v1/disputes/banks');
  },

  /** Học viên cập nhật tài khoản nhận hoàn tiền; máy chủ quyết định được phép hay không theo trạng thái khoản hoàn. */
  updateRefundAccount(id: number, req: UpdateRefundAccountReq): Promise<DisputeRes> {
    return api.put<DisputeRes>(`/api/v1/disputes/mine/${id}/refund-account`, req);
  },
};
