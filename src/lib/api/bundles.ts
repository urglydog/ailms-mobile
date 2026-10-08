import { api } from '@/lib/api/client';
import type { CourseBundle } from '@/types/courseDetailExtras';

/** Port rút gọn từ `fe/lib/api/bundles.ts` — chỉ `getForCourse` (public, đủ cho widget gợi ý
 * gói combo ở trang chi tiết khoá học). Mobile chưa có giỏ hàng (mục #6 trong bảng ưu tiên
 * UpComming_Plan.md, chưa được chọn) nên không port hành động "thêm gói vào giỏ" — widget chỉ
 * hiển thị thông tin gói, học viên mua gói qua web. */
export const bundlesApi = {
  getForCourse(courseId: number): Promise<CourseBundle[]> {
    return api.get<CourseBundle[]>(`/api/v1/courses/${courseId}/bundles`);
  },
};
