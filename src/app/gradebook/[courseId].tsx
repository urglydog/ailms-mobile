import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { gradebookApi } from '@/lib/api/quizzes';
import { BackButton } from '@/components/BackButton';
import { KnowledgeGapsWidget } from '@/components/gradebook/KnowledgeGapsWidget';
import type { QuizGrade } from '@/types/quiz';
import { COLORS } from '@/lib/theme/colors';

export default function GradebookScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['gradebook', courseId],
    queryFn: () => gradebookApi.getForCourse(Number(courseId)),
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text>{error instanceof ApiError ? error.message : 'Không tải được bảng điểm.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: COLORS.accent }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 12 }}>
      <Stack.Screen options={{ headerShown: true, title: `Bảng điểm · ${data.courseTitle}`, headerLeft: () => <BackButton /> }} />

      <KnowledgeGapsWidget courseId={Number(courseId)} />

      {data.quizzes.length === 0 ? (
        <Text style={{ color: COLORS.inkFaint, textAlign: 'center', marginTop: 40 }}>
          Chưa có bài thi nào đã làm trong khoá này. Bài thi mới xuất hiện ở đây sau lần làm đầu tiên.
        </Text>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {data.quizzes.map((quiz) => <QuizGradeCard key={quiz.quizId} quiz={quiz} />)}
        </View>
      )}
    </ScrollView>
  );
}

function QuizGradeCard({ quiz }: { quiz: QuizGrade }) {
  const canRetry = !quiz.isDeleted && (quiz.maxAttempts === null || quiz.attemptCount < quiz.maxAttempts);

  return (
    <View style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 14, gap: 6 }}>
      <Text style={{ fontWeight: '700' }}>{quiz.quizTitle}</Text>
      <Text style={{ color: COLORS.inkMuted, fontSize: 12 }}>{quiz.location}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ color: quiz.passed ? COLORS.success : COLORS.danger, fontWeight: '700', fontSize: 18 }}>
          {quiz.highestScore.toFixed(1)}
        </Text>
        <Text style={{ color: COLORS.lineDot, fontSize: 12 }}>
          {quiz.attemptCount}/{quiz.maxAttempts ?? '∞'} lượt
        </Text>
      </View>
      {quiz.isDeleted ? (
        <Text style={{ color: COLORS.lineDot, fontSize: 12 }}>Bài thi đã bị gỡ, không xem/làm lại được.</Text>
      ) : (
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
          <Pressable onPress={() => router.push(`/exam/${quiz.quizId}/history` as Href)}>
            <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Xem lịch sử</Text>
          </Pressable>
          {canRetry ? (
            <Pressable onPress={() => router.push(`/exam/${quiz.quizId}` as Href)}>
              <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Làm lại</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
