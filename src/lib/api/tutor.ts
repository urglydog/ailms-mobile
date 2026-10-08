import { api } from '@/lib/api/client';
import type { TutorAskReq, TutorAskRes, TutorRawMessage, TutorSession } from '@/types/lessonPlayer';

/** Port từ `fe/lib/api/tutor.ts` — chỉ port hỏi/trả lời + phục hồi phiên GẦN NHẤT. Bỏ đổi
 * tên/ghim/xoá phiên, bỏ đính kèm tệp (không cốt lõi, giữ scope gọn giống cách các màn khác
 * trong mobile đã trim bớt tính năng phụ so với bản web). */
export const tutorApi = {
  ask(courseId: number, req: TutorAskReq): Promise<TutorAskRes> {
    return api.post<TutorAskRes>(`/api/v1/courses/${courseId}/tutor/ask`, req);
  },

  listSessions(courseId: number): Promise<TutorSession[]> {
    return api.get<TutorSession[]>(`/api/v1/courses/${courseId}/tutor/sessions`);
  },

  getMessages(courseId: number, sessionId: number): Promise<TutorRawMessage[]> {
    return api.get<TutorRawMessage[]>(`/api/v1/courses/${courseId}/tutor/sessions/${sessionId}/messages`);
  },
};
