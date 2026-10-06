import { api, apiBlob } from '@/lib/api/client';
import type { Certificate } from '@/types/certificate';

export const certificatesApi = {
  getMine(): Promise<Certificate[]> {
    return api.get<Certificate[]>('/api/v1/certificates/me');
  },

  getPdf(certificateCode: string): Promise<Blob> {
    return apiBlob(`/api/v1/certificates/${certificateCode}/pdf`);
  },
};
