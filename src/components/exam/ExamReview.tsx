import { Pressable, ScrollView, Text, View } from 'react-native';
import { COLORS } from '@/lib/theme/colors';
import type { QuizQuestion } from '@/types/quiz';

/** Màn xem lại trước khi nộp — cổng từ `showReviewConfirm` của web: liệt kê từng câu đã/chưa trả lời, câu đánh dấu,
 * bấm vào câu để quay lại làm; nút "Quay lại bài thi" và "Nộp bài". */
export function ExamReview({
  questions,
  answers,
  flagged,
  submitting,
  onJump,
  onBack,
  onSubmit,
}: {
  questions: QuizQuestion[];
  answers: Record<number, number[]>;
  flagged: Record<number, boolean>;
  submitting: boolean;
  onJump: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const answered = questions.filter((q) => (answers[q.id] ?? []).length > 0).length;
  const flaggedCount = questions.filter((q) => flagged[q.id]).length;
  const unanswered = questions.length - answered;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.surface }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.ink }}>Xác nhận nộp bài</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Summary value={answered} label="Đã trả lời" color={COLORS.successInk} bg={COLORS.successTint} />
        <Summary value={unanswered} label="Chưa trả lời" color={unanswered > 0 ? COLORS.danger : COLORS.inkMuted} bg={unanswered > 0 ? COLORS.dangerTint : COLORS.lineSoft} />
        <Summary value={flaggedCount} label="Đánh dấu" color={COLORS.warning} bg={COLORS.streakBg} />
      </View>
      {unanswered > 0 ? (
        <Text style={{ color: COLORS.danger, fontSize: 13 }}>Còn {unanswered} câu chưa trả lời — các câu này sẽ bị tính sai.</Text>
      ) : (
        <Text style={{ color: COLORS.successInk, fontSize: 13 }}>Bạn đã trả lời đủ các câu.</Text>
      )}

      <View style={{ gap: 6 }}>
        {questions.map((q, i) => {
          const done = (answers[q.id] ?? []).length > 0;
          return (
            <Pressable
              key={q.id}
              onPress={() => onJump(i)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: done ? COLORS.line : COLORS.dangerOnNight, backgroundColor: COLORS.surfaceRaised, borderRadius: 8, padding: 10 }}
            >
              <Text style={{ fontWeight: '800', color: COLORS.ink, width: 28 }}>{i + 1}</Text>
              <Text style={{ flex: 1, color: COLORS.inkMuted, fontSize: 12.5 }} numberOfLines={1}>{q.content}</Text>
              {flagged[q.id] ? <Text style={{ color: COLORS.ink }}>🚩</Text> : null}
              <Text style={{ fontWeight: '700', fontSize: 12, color: done ? COLORS.successInk : COLORS.danger }}>{done ? '✅ Đã trả lời' : '❌ Chưa trả lời'}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Pressable onPress={onBack} disabled={submitting} style={{ flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 14, alignItems: 'center', backgroundColor: COLORS.surfaceRaised }}>
          <Text style={{ fontWeight: '700', color: COLORS.ink }}>Quay lại bài thi</Text>
        </Pressable>
        <Pressable onPress={onSubmit} disabled={submitting} style={{ flex: 1, backgroundColor: COLORS.accent, borderRadius: 10, padding: 14, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
          <Text style={{ fontWeight: '800', color: COLORS.white }}>Nộp bài</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Summary({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color }}>{label}</Text>
    </View>
  );
}
