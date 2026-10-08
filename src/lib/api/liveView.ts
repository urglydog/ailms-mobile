import { api } from '@/lib/api/client';
import type { LiveViewSummary } from '@/types/courseDetailExtras';

/** Port rút gọn từ `fe/lib/api/liveView.ts` — chỉ `listForCourse` (đủ cho banner ở trang chi
 * tiết khoá học). Xem live thật (`/live/[sessionId]`) là mục #8 trong bảng ưu tiên
 * UpComming_Plan.md, chưa được chọn — không port ở đây. */
export const liveViewApi = {
  listForCourse(courseId: number): Promise<LiveViewSummary[]> {
    return api.get<LiveViewSummary[]>(`/api/v1/courses/${courseId}/live-sessions`);
  },
};
