import { api } from '@/lib/api/client';
import type { MaterialDetail, MaterialListItem, SharedMaterialListItem } from '@/types/material';

export const materialsApi = {
  /** "Lịch sử tạo cá nhân" — chỉ học liệu do CHÍNH học viên này tự tạo. */
  listForCourse(courseId: number): Promise<MaterialListItem[]> {
    return api.get<MaterialListItem[]>(`/api/v1/materials?courseId=${courseId}`);
  },

  /** "Kho Học Liệu Official" — học liệu giảng viên tạo/đánh dấu chính thức/đã gán vào bài học.
   * Path có chữ "instructor" nhưng học viên gọi được (chỉ cần đăng nhập) — đúng path BE dùng,
   * không phải nhầm lẫn. */
  listSharedForCourse(courseId: number): Promise<SharedMaterialListItem[]> {
    return api.get<SharedMaterialListItem[]>(`/api/v1/instructor/materials/courses/${courseId}`);
  },

  getDetail(id: number): Promise<MaterialDetail> {
    return api.get<MaterialDetail>(`/api/v1/materials/${id}`);
  },
};
