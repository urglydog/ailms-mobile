import { api } from '@/lib/api/client';
import type { MaterialDetail, MaterialListItem, MaterialType, SharedMaterialListItem } from '@/types/material';

export interface MaterialGenerationReq {
  courseId: number;
  materialType: MaterialType;
  language: string;
  scopeType: 'WHOLE_COURSE';
}

export interface LanguageAvailability {
  code: string;
  label: string;
  available: boolean;
}

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

  /** Port từ `fe/lib/api/materials.ts` `requestGeneration` — bản mobile chỉ hỗ trợ
   * `scopeType: 'WHOLE_COURSE'` (chưa port chọn theo chương/bài lẻ, ngoài phạm vi MVP lần này). */
  requestGeneration(input: MaterialGenerationReq): Promise<void> {
    return api.post('/api/v1/materials', input);
  },

  getAvailableLanguages(courseId: number): Promise<LanguageAvailability[]> {
    return api.get<LanguageAvailability[]>(`/api/v1/materials/available-languages?courseId=${courseId}`);
  },

  /** Port từ `fe/lib/api/materials.ts` `updateMaterial` — dùng để sửa code Mermaid thô (mobile
   * trước đây mindmap chỉ xem được, không sửa được như web `MermaidCodeEditor.tsx`). */
  updateMaterial(id: number, data: { title?: string; mermaidCode?: string }): Promise<void> {
    return api.patch(`/api/v1/materials/${id}`, data);
  },
};
