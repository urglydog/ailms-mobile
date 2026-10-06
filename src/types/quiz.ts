// Khớp QuizAttemptDto phía BE (`be/src/main/java/com/lms/material/dto/QuizAttemptDto.java`).
export interface QuizOption {
  id: number;
  content: string;
}

export interface QuizQuestion {
  id: number;
  content: string;
  displayOrder: number;
  isMultipleChoice: boolean;
  options: QuizOption[];
}

export interface QuizAttemptStart {
  attemptId: number;
  quizId: number;
  questions: QuizQuestion[];
  /** Thi có giám sát camera — mobile CHƯA hỗ trợ, phải chặn lại (xem màn hình exam). */
  isProctored: boolean;
  maxViolations: number;
  durationMinutes: number | null;
  startedAt: string;
}

export interface QuizAnswerDetail {
  questionId: number;
  content: string;
  topicTag: string | null;
  videoTimestamp: number | null;
  referenceLessonId: number | null;
  selectedOptionIds: number[];
  correctOptionIds: number[];
  isCorrect: boolean;
  options: QuizOption[];
}

export interface QuizAttemptResult {
  attemptId: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
  details: QuizAnswerDetail[];
  isArchived: boolean;
  aiRiskLevel: string | null;
  aiRiskExplanation: string | null;
}

export interface QuizAttemptHistoryItem {
  id: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
  quizId: number;
  status: string;
  isArchived: boolean;
  allowReview: boolean;
}

// Khớp StudentGradebookController.QuizGradeDto / StudentCourseGradebookRes.
export interface QuizGradeAttempt {
  id: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
}

export interface QuizGrade {
  quizId: number;
  quizTitle: string;
  location: string;
  isOfficial: boolean;
  isDeleted: boolean;
  attemptCount: number;
  maxAttempts: number | null;
  highestScore: number;
  latestScore: number;
  latestSubmittedAt: string;
  latestAttemptId: number;
  passed: boolean;
  attempts: QuizGradeAttempt[];
}

export interface CourseGradebook {
  courseId: number;
  courseTitle: string;
  quizzes: QuizGrade[];
}
