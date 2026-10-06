import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { QuizAttemptResult } from '@/types/quiz';

/** Hiển thị kết quả 1 lượt làm bài — dùng chung cho lúc vừa nộp bài VÀ lúc xem lại lịch sử. */
export function ExamResultView({ result }: { result: QuizAttemptResult }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 36, fontWeight: '800', color: '#2563EB' }}>{result.score.toFixed(1)}</Text>
        <Text style={{ color: '#475569' }}>
          Đúng {result.correctCount}/{result.totalQuestions} câu
        </Text>
      </View>

      {result.details.map((d, idx) => (
        <View
          key={d.questionId}
          style={{
            gap: 6,
            borderWidth: 1,
            borderColor: d.isCorrect ? '#86EFAC' : '#FCA5A5',
            backgroundColor: d.isCorrect ? '#F0FDF4' : '#FEF2F2',
            borderRadius: 8,
            padding: 12,
          }}
        >
          <Text style={{ fontWeight: '600' }}>
            Câu {idx + 1}. {d.content}
          </Text>
          {d.options.map((opt) => {
            const wasSelected = d.selectedOptionIds.includes(opt.id);
            const isCorrectOption = d.correctOptionIds.includes(opt.id);
            return (
              <Text
                key={opt.id}
                style={{
                  color: isCorrectOption ? '#16A34A' : wasSelected ? '#DC2626' : '#334155',
                  fontWeight: isCorrectOption || wasSelected ? '600' : '400',
                }}
              >
                {isCorrectOption ? '✓ ' : wasSelected ? '✗ ' : '• '}
                {opt.content}
              </Text>
            );
          })}
        </View>
      ))}

      <Pressable onPress={() => router.replace('/my-courses' as Href)} style={{ alignItems: 'center', padding: 12 }}>
        <Text style={{ color: '#2563EB', fontWeight: '600' }}>Về khoá học của tôi</Text>
      </Pressable>
    </ScrollView>
  );
}
