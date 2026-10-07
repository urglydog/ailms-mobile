import { api } from '@/lib/api/client';
import type { MaterialDetail, MaterialListItem } from '@/types/material';

export const materialsApi = {
  listForCourse(courseId: number): Promise<MaterialListItem[]> {
    return api.get<MaterialListItem[]>(`/api/v1/materials?courseId=${courseId}`);
  },

  getDetail(id: number): Promise<MaterialDetail> {
    return api.get<MaterialDetail>(`/api/v1/materials/${id}`);
  },
};
