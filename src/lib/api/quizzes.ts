import { api } from '@/lib/api/client';
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
};

export const gradebookApi = {
  getForCourse(courseId: number): Promise<CourseGradebook> {
    return api.get<CourseGradebook>(`/api/v1/student/courses/${courseId}/gradebook`);
  },
};
