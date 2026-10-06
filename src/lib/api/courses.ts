import { api } from '@/lib/api/client';
import type { CourseSummary, Page } from '@/types/course';

export const coursesApi = {
  search(params: { keyword?: string; page?: number } = {}): Promise<Page<CourseSummary>> {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.page !== undefined) query.set('page', String(params.page));
    const qs = query.toString();
    return api.get<Page<CourseSummary>>(`/api/v1/courses${qs ? `?${qs}` : ''}`);
  },
};
