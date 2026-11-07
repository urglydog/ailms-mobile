import { apiFormData } from '@/lib/api/client';
import type { SupportCategory } from '@/lib/support/helpContent';
import type { PickedEvidence } from '@/types/dispute';

export interface CreateSupportTicketReq {
  email: string;
  category: SupportCategory;
  subject: string;
  message: string;
}

export const supportApi = {
  /** multipart giống web `supportApi.create` — field "request" là JSON, "files" (0-3 ảnh). */
  create(req: CreateSupportTicketReq, files: PickedEvidence[] = []): Promise<{ code: string }> {
    const formData = new FormData();
    formData.append('request', { string: JSON.stringify(req), type: 'application/json' } as unknown as Blob);
    files.forEach((f) => formData.append('files', { uri: f.uri, name: f.name, type: f.mimeType } as unknown as Blob));
    return apiFormData<{ code: string }>('/api/v1/support/tickets', formData);
  },
};
