import { api } from '@/lib/api/client';
import type { CourseDetail, CourseSummary, Page } from '@/types/course';

export const coursesApi = {
  search(params: { keyword?: string; level?: string; page?: number } = {}): Promise<Page<CourseSummary>> {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.level) query.set('level', params.level);
    if (params.page !== undefined) query.set('page', String(params.page));
    const qs = query.toString();
    return api.get<Page<CourseSummary>>(`/api/v1/courses${qs ? `?${qs}` : ''}`);
  },

  /** Lấy theo slug, không phải id — xem CourseDetail. */
  getDetail(slug: string): Promise<CourseDetail> {
    return api.get<CourseDetail>(`/api/v1/courses/${encodeURIComponent(slug)}`);
  },
};
