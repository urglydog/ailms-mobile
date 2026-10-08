import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Trophy } from 'lucide-react-native';

import { gradebookApi } from '@/lib/api/quizzes';
import type { QuizGrade } from '@/types/quiz';

import { KnowledgeGapsWidget } from '@/components/gradebook/KnowledgeGapsWidget';

/** Port rút gọn từ `fe/components/course/CourseGradebookTab.tsx` — nay đã thêm lại `KnowledgeGapsWidget`
 * (AI phân tích điểm yếu, mục #4 trong bảng ưu tiên UpComming_Plan.md). Tái dùng nguyên `gradebookApi`/`QuizGrade` đã có sẵn cho màn `gradebook/[courseId]`. */
export function GradebookTab({ courseId }: { courseId: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['gradebook', courseId],
    queryFn: () => gradebookApi.getForCourse(courseId),
  });

  if (isLoading) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !data) {
    return <Text style={{ padding: 16, color: '#DC2626' }}>Không tải được bảng điểm.</Text>;
  }

  if (data.quizzes.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
        <Trophy size={36} color="#94A3B8" strokeWidth={1.5} />
        <Text style={{ fontWeight: '700', color: '#0F172A' }}>Chưa có dữ liệu bảng điểm</Text>
        <Text style={{ color: '#64748B', fontSize: 12.5, textAlign: 'center' }}>
          Hãy học và làm bài để xem kết quả tại đây nhé!
        </Text>
      </View>
    );
  }

  const sorted = [...data.quizzes].sort((a, b) =>
    new Date(b.latestSubmittedAt).getTime() - new Date(a.latestSubmittedAt).getTime(),
  );

  return (
    <View style={{ gap: 10, paddingVertical: 16 }}>
      <KnowledgeGapsWidget courseId={courseId} />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
      {sorted.map((quiz) => (
        <QuizGradeRow key={quiz.quizId} quiz={quiz} />
      ))}
      </View>
    </View>
  );
}

function QuizGradeRow({ quiz }: { quiz: QuizGrade }) {
  return (
    <Pressable
      onPress={() => router.push(`/exam/${quiz.quizId}/history` as Href)}
      style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, gap: 4 }}
    >
      <Text style={{ fontWeight: '700', fontSize: 13.5, color: '#0F172A' }}>{quiz.quizTitle}</Text>
      <Text style={{ fontSize: 12, color: '#64748B' }}>{quiz.location}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: quiz.highestScore >= 5 ? '#16A34A' : '#DC2626' }}>
          {quiz.highestScore.toFixed(1)}/10
        </Text>
        <Text style={{ fontSize: 11.5, color: '#94A3B8' }}>
          {quiz.isOfficial ? 'Thi chính thức' : 'Ôn tập (AI)'} · {quiz.attemptCount}/{quiz.maxAttempts ?? '∞'} lượt
        </Text>
      </View>
    </Pressable>
  );
}
