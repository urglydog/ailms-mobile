import { api, ApiError } from '@/lib/api/client';
import type { StudyPlanDto } from '@/types/lessonPlayer';

/** Port từ phần API trong `fe/components/course/CourseStudyPlanTab.tsx`. Chỉ port
 * xem/tạo/xoá — bỏ "dời lịch" (`reschedule`) và xuất file .ics (không có API .ics chuẩn trên
 * RN, không cần thiết cho bản port đầu tiên) để giữ scope gọn. */
export const studyPlanApi = {
  async getForCourse(courseId: number): Promise<StudyPlanDto | null> {
    try {
      return await api.get<StudyPlanDto>(`/api/v1/student/courses/${courseId}/study-plan`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  generate(courseId: number, data: { targetDate: string; hoursPerWeek: number }): Promise<StudyPlanDto> {
    return api.post<StudyPlanDto>(`/api/v1/student/courses/${courseId}/study-plan/generate`, data);
  },

  delete(courseId: number): Promise<void> {
    return api.delete<void>(`/api/v1/student/courses/${courseId}/study-plan`);
  },
};
