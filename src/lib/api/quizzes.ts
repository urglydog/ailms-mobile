import { api } from '@/lib/api/client';
import { getAccessToken, resolveBaseUrl } from '@/lib/api/client';
import * as FileSystem from 'expo-file-system';
import type { CourseGradebook, QuizAttemptHistoryItem, QuizAttemptResult, QuizAttemptStart } from '@/types/quiz';

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

  recordViolation(attemptId: number, data: { type: string; detail?: string; clientOffsetSec?: number }): Promise<any> {
    return api.post(`/api/v1/quizzes/attempts/${attemptId}/violations`, data);
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

export const gradebookApi = {
  getForCourse(courseId: number): Promise<CourseGradebook> {
    return api.get<CourseGradebook>(`/api/v1/student/courses/${courseId}/gradebook`);
  },
};
