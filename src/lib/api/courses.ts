import { api } from '@/lib/api/client';
import type { CourseDetail, CourseSummary, Page } from '@/types/course';

export type CourseSortBy = 'relevance' | 'rating' | 'reviews' | 'newest';

/** Khớp bộ lọc UC09 của web (`fe/lib/api/publicCourses.ts` → `/api/v1/courses`). */
export interface CourseSearchParams {
  keyword?: string;
  categorySlug?: string;
  level?: string;
  priceType?: 'all' | 'free' | 'paid';
  minRating?: number;
  /** "0-1" | "1-3" | "3-6" | "6-17" | "17+" (giờ video). */
  durationBucket?: string;
  sortBy?: CourseSortBy;
  page?: number;
}

export const categoriesApi = {
  list(): Promise<{ id: number; name: string; slug: string }[]> {
    return api.get<{ id: number; name: string; slug: string }[]>('/api/v1/categories');
  },
};

export const coursesApi = {
  search(params: CourseSearchParams = {}): Promise<Page<CourseSummary>> {
    const query = new URLSearchParams();
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.categorySlug) query.set('categorySlug', params.categorySlug);
    if (params.level) query.set('level', params.level);
    if (params.priceType && params.priceType !== 'all') query.set('priceType', params.priceType);
    if (params.minRating) query.set('minRating', String(params.minRating));
    if (params.durationBucket) query.set('durationBucket', params.durationBucket);
    if (params.sortBy && params.sortBy !== 'newest') query.set('sortBy', params.sortBy);
    if (params.page !== undefined) query.set('page', String(params.page));
    const qs = query.toString();
    return api.get<Page<CourseSummary>>(`/api/v1/courses${qs ? `?${qs}` : ''}`);
  },

  /** Kệ "Được đề xuất": khoá đang trong đợt quảng bá đã được admin duyệt (endpoint công khai, như web `publicCoursesApi.featured`). */
  async featured(placement: 'HOME_FEATURED' | 'CATEGORY_FEATURED' = 'HOME_FEATURED', size = 8, categorySlug?: string): Promise<CourseSummary[]> {
    const query = new URLSearchParams({ placement, size: String(size) });
    if (categorySlug) query.set('categorySlug', categorySlug);
    const page = await api.get<{ content: CourseSummary[] }>(`/api/v1/courses/featured?${query.toString()}`);
    return page.content;
  },

  /** Lấy theo slug, không phải id — xem CourseDetail. */
  getDetail(slug: string): Promise<CourseDetail> {
    return api.get<CourseDetail>(`/api/v1/courses/${encodeURIComponent(slug)}`);
  },
};
