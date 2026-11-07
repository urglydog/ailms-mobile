import { api, apiFormData } from '@/lib/api/client';
import type {
  AnnouncementItem,
  AssignmentSubmissionItem,
  LessonChatMessage,
  StudentAssignmentItem,
} from '@/types/lessonPlayer';

/** Port từ `fe/lib/api/communication.ts` — chỉ port các hàm phía Học viên cần cho lesson player
 * (thông báo khoá học, bài tập nộp, lịch sử chat realtime). Không port phần phía Giảng viên. */
export const announcementApi = {
  listForCourse(courseId: number): Promise<AnnouncementItem[]> {
    return api.get<AnnouncementItem[]>(`/api/v1/courses/${courseId}/announcements`);
  },
};

export const assignmentApi = {
  listForStudent(lessonId: number): Promise<StudentAssignmentItem[]> {
    return api.get<StudentAssignmentItem[]>(`/api/v1/lessons/${lessonId}/assignments`);
  },

  /** `apiFormData` tự refresh access token hết hạn trước khi coi là lỗi thật — đúng rule bắt
   * buộc của dự án (CLAUDE.md mục 3), không tự viết multipart thô. */
  submit(assignmentId: number, data: { textContent?: string; file?: { uri: string; name: string; mimeType: string } | null }): Promise<AssignmentSubmissionItem> {
    const formData = new FormData();
    if (data.textContent) formData.append('textContent', data.textContent);
    if (data.file) {
      // React Native FormData nhận object {uri, name, type} thay vì đối tượng File thật của web.
      formData.append('file', { uri: data.file.uri, name: data.file.name, type: data.file.mimeType } as unknown as Blob);
    }
    return apiFormData<AssignmentSubmissionItem>(`/api/v1/assignments/${assignmentId}/submissions`, formData);
  },
};

export const lessonChatApi = {
  /** Lịch sử chat (REST) — tin nhắn mới sau đó nhận qua STOMP realtime, xem `useLessonChat.ts`. */
  getHistory(lessonId: number): Promise<LessonChatMessage[]> {
    return api.get<LessonChatMessage[]>(`/api/v1/lessons/${lessonId}/chats`);
  },
};

// ==================== Tin nhắn Học viên ↔ Giảng viên ====================

export interface ConversationItem {
  id: number;
  otherUserId: number;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  courseId: number | null;
  courseTitle: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface MessageItem {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string;
  createdAt: string;
  mine: boolean;
}

/** Port từ `fe/lib/api/communication.ts` (`messageApi`) — phía Học viên. */
export const messageApi = {
  listConversations(): Promise<ConversationItem[]> {
    return api.get<ConversationItem[]>('/api/v1/messages/conversations');
  },
  getMessages(conversationId: number): Promise<MessageItem[]> {
    return api.get<MessageItem[]>(`/api/v1/messages/conversations/${conversationId}`);
  },
  sendMessage(conversationId: number, content: string): Promise<MessageItem> {
    return api.post<MessageItem>(`/api/v1/messages/conversations/${conversationId}`, { content });
  },
  /** Bắt đầu (hoặc lấy lại) hội thoại với giảng viên của khóa học. */
  startAsStudent(courseId: number): Promise<ConversationItem> {
    return api.post<ConversationItem>('/api/v1/messages/conversations/start', { courseId, studentId: null });
  },
};
