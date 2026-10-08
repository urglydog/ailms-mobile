// Types cho các tab mở rộng của lesson player (08/10/2026, port từ web
// `fe/app/(learn)/learn/[lessonId]/page.tsx`) — chỉ port Tổng quan/Lộ trình AI/Hỏi đáp/Bảng
// điểm/Tài nguyên/Đánh giá/Bài tập + AI Tutor. KHÔNG port dubbing/transcript/giới hạn phiên xem
// đồng thời (nằm ngoài phạm vi đã chốt, để dành hỏi ưu tiên sau — xem UpComming_Plan.md).

// ── Tổng quan (khớp AnnouncementItem phía BE) ──
export interface AnnouncementItem {
  id: number;
  courseId: number;
  courseTitle: string;
  title: string;
  content: string;
  createdAt: string;
}

// ── Lộ trình AI (khớp StudyPlanDto phía BE) ──
export interface StudyLesson {
  lesson_id: number;
  title: string;
  duration_minutes: number;
}

export interface StudyDay {
  date: string;
  lessons: StudyLesson[];
  objective: string;
}

export interface StudyPlanDto {
  courseId: number;
  targetDate: string;
  hoursPerWeek: number;
  /** Chuỗi JSON của StudyDay[] — BE trả nguyên văn, FE tự parse. */
  planData: string;
}

// ── Bảng điểm (khớp StudentGradebookController.QuizGradeDto — đã có CourseGradebook/QuizGrade
// trong src/types/quiz.ts, dùng lại nguyên, không định nghĩa trùng ở đây) ──

// ── Tài nguyên (khớp Resource trong CourseResourcesTab.tsx — ĐÃ có CourseResource trong
// src/types/courseResource.ts, dùng lại, không định nghĩa trùng) ──

// ── Hỏi đáp realtime (khớp ChatMessage trong fe/hooks/useCommunitySocket.ts) ──
export interface LessonChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string;
  timestamp: string;
  parentId?: string;
  isInstructor: boolean;
}

// ── Bài tập (khớp AssignmentItem/AssignmentSubmissionItem/StudentAssignmentItem phía
// fe/lib/api/communication.ts) ──
export interface AssignmentItem {
  id: number;
  lessonId: number;
  lessonTitle: string;
  courseId: number;
  courseTitle: string;
  title: string;
  instructions: string | null;
  dueDate: string | null;
  maxScore: number | null;
  createdAt: string;
  submissionCount: number;
  gradedCount: number;
}

export interface AssignmentSubmissionItem {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  textContent: string | null;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

export interface StudentAssignmentItem {
  assignment: AssignmentItem;
  mySubmission: AssignmentSubmissionItem | null;
}

// ── AI Tutor (khớp fe/types/domain.ts — chỉ port phần cần cho chat tối thiểu, bỏ
// rename/pin/lịch sử nhiều phiên như bản web để giữ scope gọn, giống cách LectureQuiz/
// FlashcardStudy đã trim bớt tính năng phụ trước đây) ──
export interface TutorAskReq {
  question: string;
  sessionId?: number | null;
  currentLessonId: number;
}

export interface TutorAskRes {
  sessionId: number;
  answer: string;
  citedTimestamps: number[];
  tokenUsed: number | null;
  contextLessonId: number;
}

export interface TutorRawMessage {
  id: number;
  sender: 'USER' | 'AI';
  content: string;
  citedTimestamps: number[];
  contextLessonId: number | null;
}

export interface TutorSession {
  id: number;
  title: string;
  lastActivityAt: string;
  isPinned: boolean;
}
