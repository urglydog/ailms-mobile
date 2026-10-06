import { api } from '@/lib/api/client';
import type { Enrollment } from '@/types/enrollment';

export const enrollmentsApi = {
  getMine(): Promise<Enrollment[]> {
    return api.get<Enrollment[]>('/api/v1/enrollments/mine');
  },

  enrollFree(courseId: number, password?: string): Promise<void> {
    const qs = password ? `?password=${encodeURIComponent(password)}` : '';
    return api.post<void>(`/api/v1/enrollments/free/${courseId}${qs}`);
  },
};
