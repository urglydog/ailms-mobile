import { api } from '@/lib/api/client';
import type { Page } from '@/types/course';
import type { CourseReview, CreateReviewRequest } from '@/types/review';

export const reviewsApi = {
  listForCourse(courseId: number): Promise<Page<CourseReview>> {
    return api.get<Page<CourseReview>>(`/api/v1/courses/${courseId}/reviews`);
  },

  create(courseId: number, data: CreateReviewRequest): Promise<CourseReview> {
    return api.post<CourseReview>(`/api/v1/courses/${courseId}/reviews`, data);
  },
};
