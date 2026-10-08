import { api } from '@/lib/api/client';

export interface KnowledgeGapDto {
  topic: string;
  errorRate: number;
  videoTimestamp: number | null;
  referenceLessonId: number | null;
  incorrectCount: number;
  totalCount: number;
}

export interface KnowledgeGapsRes {
  gaps: KnowledgeGapDto[];
}

export const knowledgeGapsApi = {
  getForCourse(courseId: number): Promise<KnowledgeGapsRes> {
    return api.get<KnowledgeGapsRes>(`/api/v1/student/courses/${courseId}/knowledge-gaps`);
  },
};
