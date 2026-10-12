import { api, ApiError } from '@/lib/api/client';
import type { StudyPlanDto } from '@/types/lessonPlayer';

/** Port từ phần API trong `fe/components/course/CourseStudyPlanTab.tsx`. (12/10/2026, bổ sung
 * `reschedule` — trước đây bỏ qua "để giữ scope gọn", nhưng đây là tính năng lõi (dời lịch khi
 * trễ tiến độ), không phải phụ, nên port lại đầy đủ.) */
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

  /** `targetDate` rỗng/undefined → gửi `{}` (không phải `""`) để tránh BE parse lỗi
   * DateTimeParseException, khớp đúng xử lý của `fe`. */
  reschedule(courseId: number, targetDate?: string): Promise<StudyPlanDto> {
    return api.put<StudyPlanDto>(
      `/api/v1/student/courses/${courseId}/study-plan/reschedule`,
      targetDate ? { targetDate } : {},
    );
  },
};
