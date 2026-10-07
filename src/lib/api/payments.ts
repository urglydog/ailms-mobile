import { api } from '@/lib/api/client';
import type { CreatePaymentRequest, PaymentRecord, PaymentUrlResponse } from '@/types/payment';

export const paymentsApi = {
  create(data: CreatePaymentRequest): Promise<PaymentUrlResponse> {
    return api.post<PaymentUrlResponse>('/api/v1/payments/create', data);
  },

  listMine(): Promise<PaymentRecord[]> {
    return api.get<PaymentRecord[]>('/api/v1/payments/mine');
  },
};
