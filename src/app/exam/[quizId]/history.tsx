import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { quizzesApi } from '@/lib/api/quizzes';
import { BackButton } from '@/components/BackButton';
import type { QuizAttemptHistoryItem } from '@/types/quiz';

export default function ExamHistoryScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exam-history', quizId],
    queryFn: () => quizzesApi.getAttemptHistory(Number(quizId)),
    enabled: !!quizId,
  });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: 'Lịch sử làm bài', headerLeft: () => <BackButton /> }} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được lịch sử.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: '#2563EB' }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#64748B' }}>Chưa có lượt làm bài nào.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => <HistoryRow item={item} />}
        />
      )}
    </View>
  );
}

function HistoryRow({ item }: { item: QuizAttemptHistoryItem }) {
  return (
    <Pressable
      onPress={() => item.allowReview && router.push(`/exam/attempt/${item.id}` as Href)}
      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
    >
      <View>
        <Text style={{ fontWeight: '600' }}>{new Date(item.submittedAt).toLocaleString('vi-VN')}</Text>
        <Text style={{ color: '#94A3B8', fontSize: 12 }}>
          {item.correctCount}/{item.totalQuestions} câu đúng
          {item.isArchived ? ' · Đã lưu trữ' : ''}
        </Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#2563EB' }}>{item.score.toFixed(1)}</Text>
    </Pressable>
  );
}
