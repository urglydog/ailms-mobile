import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ExamResultView } from '@/components/ExamResultView';
import { ApiError } from '@/lib/api/client';
import { quizzesApi } from '@/lib/api/quizzes';
import { BackButton } from '@/components/BackButton';

export default function ExamAttemptReviewScreen() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exam-attempt-detail', attemptId],
    queryFn: () => quizzesApi.getAttemptDetail(Number(attemptId)),
    enabled: !!attemptId,
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
        <Text>{error instanceof ApiError ? error.message : 'Không tải được bài làm.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: '#2563EB' }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Xem lại bài làm', headerLeft: () => <BackButton /> }} />
      <ExamResultView result={data} />
    </>
  );
}
