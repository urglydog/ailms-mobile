import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AlertTriangle, ChevronLeft, ChevronRight, Trophy } from 'lucide-react-native';

import { gradebookApi } from '@/lib/api/quizzes';
import type { QuizGrade } from '@/types/quiz';

import { KnowledgeGapsWidget } from '@/components/gradebook/KnowledgeGapsWidget';
import { COLORS } from '@/lib/theme/colors';

const ITEMS_PER_PAGE = 10;

/** Port từ `fe/components/course/CourseGradebookTab.tsx`. (12/10/2026) đã bổ sung phân trang
 * (10/trang, khớp `ITEMS_PER_PAGE` bên web) và badge "đã bị lưu trữ" cho quiz bị giảng viên xoá
 * (`isDeleted`) — trước đây bỏ cả 2 "để giữ scope gọn" dù field `isDeleted` đã có sẵn trong type,
 * chỉ chưa render. */
export function GradebookTab({ courseId }: { courseId: number }) {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['gradebook', courseId],
    queryFn: () => gradebookApi.getForCourse(courseId),
  });

  // Bài làm gần nhất lên đầu; quiz chưa làm lần nào (không có latestSubmittedAt) xuống cuối —
  // khớp `fe`'s sort (trước đây mobile thiếu nhánh "chưa làm" nên bị xếp NaN lẫn lộn).
  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.quizzes].sort((a, b) => {
      if (!a.latestSubmittedAt) return 1;
      if (!b.latestSubmittedAt) return -1;
      return new Date(b.latestSubmittedAt).getTime() - new Date(a.latestSubmittedAt).getTime();
    });
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paged = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !data) {
    return <Text style={{ padding: 16, color: COLORS.danger }}>Không tải được bảng điểm.</Text>;
  }

  if (data.quizzes.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
        <Trophy size={36} color={COLORS.lineDot} strokeWidth={1.5} />
        <Text style={{ fontWeight: '700', color: COLORS.ink }}>Chưa có dữ liệu bảng điểm</Text>
        <Text style={{ color: COLORS.inkFaint, fontSize: 12.5, textAlign: 'center' }}>
          Hãy học và làm bài để xem kết quả tại đây nhé!
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10, paddingVertical: 16 }}>
      <KnowledgeGapsWidget courseId={courseId} />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {paged.map((quiz) => (
          <QuizGradeRow key={quiz.quizId} quiz={quiz} />
        ))}

        {totalPages > 1 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 4 }}>
            <Pressable onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ opacity: page === 1 ? 0.3 : 1 }}>
              <ChevronLeft size={22} color={COLORS.accent} />
            </Pressable>
            <Text style={{ fontSize: 12.5, color: COLORS.inkFaint }}>Trang {page}/{totalPages}</Text>
            <Pressable onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ opacity: page === totalPages ? 0.3 : 1 }}>
              <ChevronRight size={22} color={COLORS.accent} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function QuizGradeRow({ quiz }: { quiz: QuizGrade }) {
  return (
    <Pressable
      onPress={() => router.push(`/exam/${quiz.quizId}/history` as Href)}
      style={{ borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 10, padding: 12, gap: 4 }}
    >
      <Text style={{ fontWeight: '700', fontSize: 13.5, color: COLORS.ink }}>{quiz.quizTitle}</Text>
      <Text style={{ fontSize: 12, color: COLORS.inkFaint }}>{quiz.location}</Text>

      {quiz.isDeleted ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginTop: 2, alignSelf: 'flex-start' }}>
          <AlertTriangle size={13} color={COLORS.warning} />
          <Text style={{ fontSize: 11, color: COLORS.warning }}>Bài tập/bài thi này đã được giảng viên lưu trữ.</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: quiz.highestScore >= 5 ? COLORS.success : COLORS.danger }}>
          {quiz.highestScore.toFixed(1)}/10
        </Text>
        <Text style={{ fontSize: 11.5, color: COLORS.lineDot }}>
          {quiz.isOfficial ? 'Thi chính thức' : 'Ôn tập (AI)'} · {quiz.attemptCount}/{quiz.maxAttempts ?? '∞'} lượt
        </Text>
      </View>
    </Pressable>
  );
}
