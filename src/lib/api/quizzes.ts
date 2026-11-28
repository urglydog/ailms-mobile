import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { api, getAccessToken, resolveBaseUrl } from '@/lib/api/client';
import type {
  CourseGradebook,
  ProctorFrameReq,
  ProctorFrameRes,
  QuizAttemptHistoryItem,
  QuizAttemptResult,
  QuizAttemptStart,
  ViolationRes,
} from '@/types/quiz';

export interface ExplainWrongAnswerReq {
  questionId: number;
  selectedOptionId: number | null;
}

export interface ExplainWrongAnswerRes {
  explanation: string;
}

export const quizzesApi = {
  startAttempt(quizId: number): Promise<QuizAttemptStart> {
    return api.get<QuizAttemptStart>(`/api/v1/quizzes/${quizId}/start-attempt`);
  },

  submitAttempt(attemptId: number, answers: Record<number, number[]>): Promise<QuizAttemptResult> {
    return api.post<QuizAttemptResult>(`/api/v1/quizzes/attempts/${attemptId}/submit`, { answers });
  },

  getAttemptHistory(quizId: number): Promise<QuizAttemptHistoryItem[]> {
    return api.get<QuizAttemptHistoryItem[]>(`/api/v1/quizzes/${quizId}/attempts`);
  },

  getAttemptDetail(attemptId: number): Promise<QuizAttemptResult> {
    return api.get<QuizAttemptResult>(`/api/v1/quizzes/attempts/${attemptId}`);
  },

  recordViolation(attemptId: number, data: { type: string; detail?: string; clientOffsetSec?: number }): Promise<ViolationRes> {
    return api.post<ViolationRes>(`/api/v1/quizzes/attempts/${attemptId}/violations`, data);
  },

  /** Gửi 1 khung hình chụp từ camera giám sát để BE (Gemini Vision) xác minh đếm người/hướng
   * nhìn — nguồn vi phạm hình ảnh được SERVER xác thực (port từ `fe/lib/api/quizzes.ts
   * analyzeProctorFrame`), khác `ProctoringCameraView` chỉ phát hiện `TAB_SWITCH` phía client. */
  analyzeProctorFrame(attemptId: number, data: ProctorFrameReq): Promise<ProctorFrameRes> {
    return api.post<ProctorFrameRes>(`/api/v1/quizzes/attempts/${attemptId}/proctor-frame`, data);
  },

  /** AI Gia sư giải thích tại sao chọn sai — port từ `fe`'s `explainWrongAnswer`
   * (`hooks/useQuizzes.ts`). Dùng chung cho cả kết quả thi chính thức (`ExamResultView`) lẫn quiz
   * ôn tập cá nhân (`LectureQuiz`). */
  explainWrongAnswer(data: ExplainWrongAnswerReq): Promise<ExplainWrongAnswerRes> {
    return api.post<ExplainWrongAnswerRes>('/api/v1/quizzes/tutor/explain', data);
  },

  /**
   * Tải video giám sát bằng bộ tải NATIVE của hệ điều hành (`FileSystem.uploadAsync`, đọc thẳng từ tệp — ổn định với tệp lớn). Đi qua `fetch` + `FormData`
   * của React Native thì trên iPhone báo lỗi mạng ngay lập tức dù mạng bình thường. Vì không có sẵn cơ chế làm mới token của `api`, gọi trước một yêu cầu nhẹ
   * để token được làm mới nếu đã hết hạn. BE quyết định đuôi/loại tệp lưu theo TÊN GỐC nên sao chép tệp thành `attempt-<id>.mp4` (tên khác `.mp4` bị lưu
   * thành `.webm` sai và người chấm không phát được).
   */
  async uploadRecording(attemptId: number, fileUri: string, durationSec: number): Promise<void> {
    try {
      await api.get('/api/v1/users/me');
    } catch {
      // Lỗi mạng/phiên sẽ lộ ra ở bước tải bên dưới.
    }
    const token = await getAccessToken();

    let uploadUri = fileUri;
    try {
      const dir = new Directory(Paths.cache, 'proctoring');
      if (!dir.exists) dir.create({ intermediates: true });
      const target = new File(dir, `attempt-${attemptId}.mp4`);
      if (target.exists) target.delete();
      new File(fileUri).copy(target);
      uploadUri = target.uri;
    } catch {
      uploadUri = fileUri; // không đổi tên được thì tải tệp gốc
    }

    const response = await FileSystem.uploadAsync(`${resolveBaseUrl()}/api/v1/quizzes/attempts/${attemptId}/recording?durationSec=${durationSec}`, uploadUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'video/mp4',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status >= 400) {
      throw new Error(`Máy chủ trả mã ${response.status}: ${response.body.slice(0, 160)}`);
    }
  },
};

/** Khớp `QuizDto.OptionReq`/`QuestionUpdateReq` phía BE (`be/.../material/dto/QuizDto.java`) —
 * port từ `fe/components/materials/QuizPersonalEditor.tsx`. */
export interface QuizOptionReq {
  id?: number;
  content: string;
  isCorrect: boolean;
}

export interface QuizQuestionUpdateReq {
  content: string;
  isMultipleChoice?: boolean;
  options: QuizOptionReq[];
}

export const personalQuizApi = {
  updateQuestion(questionId: number, data: QuizQuestionUpdateReq): Promise<void> {
    return api.put(`/api/v1/quizzes/questions/${questionId}`, data);
  },

  addQuestion(quizId: number, data: QuizQuestionUpdateReq): Promise<void> {
    return api.post(`/api/v1/quizzes/${quizId}/questions`, data);
  },

  deleteQuestion(questionId: number): Promise<void> {
    return api.delete(`/api/v1/quizzes/questions/${questionId}`);
  },
};

export const gradebookApi = {
  getForCourse(courseId: number): Promise<CourseGradebook> {
    return api.get<CourseGradebook>(`/api/v1/student/courses/${courseId}/gradebook`);
  },
};
