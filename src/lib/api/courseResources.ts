import { api } from '@/lib/api/client';
import type { CourseResource } from '@/types/courseResource';

export const courseResourcesApi = {
  /**
   * Dùng endpoint student riêng (`/api/v1/student/courses/...`), KHÔNG dùng path
   * `/api/v1/instructor/resources/courses/...` mà bản web dùng chung cho cả 2 vai trò — endpoint
   * student tự kiểm tra ghi danh ở BE (`StudentResourceController.java`), path instructor chỉ
   * yêu cầu đăng nhập, không chặt bằng.
   */
  listForCourse(courseId: number): Promise<CourseResource[]> {
    return api.get<CourseResource[]>(`/api/v1/student/courses/${courseId}/resources`);
  },
};
