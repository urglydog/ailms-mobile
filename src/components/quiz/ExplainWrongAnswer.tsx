import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { quizzesApi } from '@/lib/api/quizzes';

interface Props {
  questionId: number;
  selectedOptionId: number | null;
  /** Bấm "Ôn tập lại lý thuyết" nhảy tới đúng mốc thời gian trong video — port từ `fe`'s
   * `/learn/{lessonId}?seek={videoTimestamp}`. `null` thì không hiện link này. */
  referenceLessonId?: number | null;
  videoTimestamp?: number | null;
}

/** "Hỏi Gia sư AI tại sao sai?" — dùng chung cho `ExamResultView` (thi chính thức) và
 * `LectureQuiz` (ôn tập cá nhân), port từ `fe/components/materials/QuizViewer.tsx` +
 * `fe/app/(student)/exam/[quizId]/page.tsx` (cùng 1 pattern `handleExplain`/`explanations`, chỉ
 * khác chỗ gọi). Không dùng markdown renderer (mobile chưa có lib nào cho việc này, TutorChat
 * cũng đang hiện text thuần) — hiện thẳng text trả về. */
export function ExplainWrongAnswer({ questionId, selectedOptionId, referenceLessonId, videoTimestamp }: Props) {
  const [state, setState] = useState<{ loading: boolean; text?: string } | null>(null);

  const handleExplain = async () => {
    setState({ loading: true });
    try {
      const res = await quizzesApi.explainWrongAnswer({ questionId, selectedOptionId });
      setState({ loading: false, text: res.explanation });
    } catch {
      setState({ loading: false, text: 'Có lỗi khi kết nối AI. Vui lòng thử lại.' });
    }
  };

  return (
    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {!state ? (
          <Pressable onPress={handleExplain}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#2563EB' }}>Hỏi Gia sư AI tại sao sai?</Text>
          </Pressable>
        ) : null}
        {referenceLessonId != null ? (
          <Pressable
            onPress={() => router.push(`/lessons/${referenceLessonId}${videoTimestamp ? `?seek=${videoTimestamp}` : ''}` as Href)}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#2563EB' }}>Ôn tập lại lý thuyết ↗</Text>
          </Pressable>
        ) : null}
      </View>

      {state ? (
        <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 8, padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1D4ED8' }}>Gia sư AI giải thích:</Text>
            {state.loading ? <Text style={{ fontSize: 11.5, color: '#3B82F6' }}>Đang suy nghĩ...</Text> : null}
          </View>
          {state.text ? <Text style={{ fontSize: 12.5, color: '#1E293B', lineHeight: 18 }}>{state.text}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
