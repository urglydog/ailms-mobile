import { api, apiBlob } from '@/lib/api/client';
import type { Invoice } from '@/types/invoice';

/** Chứng từ của chính mình (biên lai, phiếu hoàn tiền...) — BE chỉ trả chứng từ của người đăng nhập. */
export const invoicesApi = {
  listMine(): Promise<Invoice[]> {
    return api.get<Invoice[]>('/api/v1/invoices');
  },

  pdf(id: number): Promise<Blob> {
    return apiBlob(`/api/v1/invoices/${id}/pdf`);
  },
};
