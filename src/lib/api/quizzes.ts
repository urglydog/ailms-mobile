import { api } from '@/lib/api/client';
import { getAccessToken, resolveBaseUrl } from '@/lib/api/client';
import * as FileSystem from 'expo-file-system';
import type {
  CourseGradebook,
  ProctorFrameReq,
  ProctorFrameRes,
  QuizAttemptHistoryItem,
  QuizAttemptResult,
  QuizAttemptStart,
  ViolationRes,
} from '@/types/quiz';

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

  async uploadRecording(attemptId: number, fileUri: string, durationSec: number): Promise<void> {
    const token = await getAccessToken();
    const url = `${resolveBaseUrl()}/api/v1/quizzes/attempts/${attemptId}/recording?durationSec=${durationSec}`;
    
    const response = await FileSystem.uploadAsync(url, fileUri, {
      httpMethod: 'POST',
      uploadType: 1 as any, // FileSystemUploadType.MULTIPART = 1
      fieldName: 'file',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status >= 400) {
      throw new Error(`Upload failed with status ${response.status}: ${response.body}`);
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
