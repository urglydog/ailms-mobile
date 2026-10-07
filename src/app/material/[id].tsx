import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react-native';
import type { Href } from 'expo-router';

import { ApiError } from '@/lib/api/client';
import { flashcardsApi } from '@/lib/api/flashcards';
import { materialsApi } from '@/lib/api/materials';
import { MindmapView } from '@/components/material/MindmapView';
import { BackButton } from '@/components/BackButton';
import type { FlashcardCard, QuizQuestion } from '@/types/material';

export default function MaterialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const materialId = Number(id);

  const { data: material, isLoading, error, refetch } = useQuery({
    queryKey: ['material', materialId],
    queryFn: () => materialsApi.getDetail(materialId),
    enabled: !!materialId,
  });

  if (isLoading || !material) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text>{error instanceof ApiError ? error.message : 'Không tải được học liệu.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: '#2563EB' }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: material.title || 'Học liệu', headerLeft: () => <BackButton /> }} />
      {material.materialType === 'MINDMAP' && material.mermaidCode ? (
        <MindmapView mermaidCode={material.mermaidCode} />
      ) : null}
      {material.materialType === 'FLASHCARD' && material.flashcards ? (
        <FlashcardWorkspace materialId={materialId} initialCards={material.flashcards} />
      ) : null}
      {material.materialType === 'QUIZ' && material.quizType === 'OFFICIAL_EXAM' && material.quizId ? (
        <ExamEntry quizId={material.quizId} />
      ) : null}
      {material.materialType === 'QUIZ' && material.quizType === 'LECTURE_QUIZ' && material.quizQuestions ? (
        <LectureQuiz questions={material.quizQuestions} />
      ) : null}
    </View>
  );
}

/** QUIZ loại OFFICIAL_EXAM (có giờ/giám sát) — mở màn thi chính thức đã có sẵn (`exam/[quizId]`).
 * KHÔNG dùng cho LECTURE_QUIZ (xem {@link LectureQuiz}) — bug thật 07/10/2026: trước đây mọi
 * QUIZ material đều bị mở nhầm vào đây bất kể quizType. */
function ExamEntry({ quizId }: { quizId: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <ListChecks size={48} color="#2563EB" strokeWidth={1.5} />
      <Text style={{ fontSize: 16, color: '#475569', textAlign: 'center' }}>
        Đây là bài thi chính thức — có tính giờ, chỉ làm được số lần giới hạn.
      </Text>
      <Pressable
        onPress={() => router.push(`/exam/${quizId}` as Href)}
        style={{ backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Bắt đầu làm bài</Text>
      </Pressable>
    </View>
  );
}

/** QUIZ loại LECTURE_QUIZ (ôn tập nhanh) — làm trực tiếp tại chỗ, KHÔNG tính giờ, không giới hạn
 * số lần, không gửi kết quả lên BE (đúng hành vi bản Web `QuizViewer.tsx` — chấm điểm thuần phía
 * client, không có "lượt làm bài" nào được lưu). Bỏ tính năng "Hỏi Gia sư AI tại sao sai" và lưu
 * draft (localStorage) của bản Web để giữ scope gọn — có thể bổ sung sau nếu cần. */
function LectureQuiz({ questions }: { questions: QuizQuestion[] }) {
  const [isStarted, setIsStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!questions.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#64748B' }}>Chưa có câu hỏi ôn tập nào.</Text>
      </View>
    );
  }

  if (!isStarted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <ListChecks size={48} color="#2563EB" strokeWidth={1.5} />
        <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center' }}>Ôn tập nhanh</Text>
        <Text style={{ color: '#64748B', textAlign: 'center' }}>
          Bài tập có {questions.length} câu hỏi giúp củng cố kiến thức vừa học — không tính giờ, làm lại bao nhiêu lần tuỳ ý.
        </Text>
        <Pressable
          onPress={() => setIsStarted(true)}
          style={{ backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Bắt đầu làm bài</Text>
        </Pressable>
      </View>
    );
  }

  if (isFinished) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <CheckCircle2 size={48} color="#16A34A" strokeWidth={1.5} />
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Hoàn thành bài trắc nghiệm!</Text>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#2563EB' }}>
          {score}/{questions.length}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={{ color: '#2563EB', fontWeight: '600' }}>Hoàn tất & quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const question = questions[currentIdx];
  const isAnswered = selectedOptionId !== null;
  const selectedIsCorrect = question.options.find((o) => o.id === selectedOptionId)?.isCorrect ?? false;

  const handleNext = () => {
    if (selectedIsCorrect) setScore((s) => s + 1);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOptionId(null);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '600', color: '#334155' }}>
          Câu {currentIdx + 1}/{questions.length}
        </Text>
        <View style={{ width: '40%', height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, height: '100%', backgroundColor: '#2563EB' }} />
        </View>
      </View>

      <Text style={{ fontSize: 18, fontWeight: '600', color: '#0F172A' }}>{question.content}</Text>

      <View style={{ gap: 10 }}>
        {question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          let borderColor = '#E2E8F0';
          let backgroundColor = '#fff';
          let textColor = '#0F172A';
          if (isAnswered) {
            if (option.isCorrect) {
              borderColor = '#16A34A';
              backgroundColor = '#F0FDF4';
              textColor = '#166534';
            } else if (isSelected) {
              borderColor = '#DC2626';
              backgroundColor = '#FEF2F2';
              textColor = '#991B1B';
            } else {
              backgroundColor = '#F8FAFC';
            }
          } else if (isSelected) {
            borderColor = '#2563EB';
            backgroundColor = '#EFF6FF';
          }
          return (
            <Pressable
              key={option.id}
              disabled={isAnswered}
              onPress={() => setSelectedOptionId(option.id)}
              style={{ borderWidth: 1, borderColor, backgroundColor, borderRadius: 10, padding: 14 }}
            >
              <Text style={{ color: textColor, fontWeight: '500' }}>{option.content}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        disabled={!isAnswered}
        onPress={handleNext}
        style={{
          backgroundColor: isAnswered ? '#2563EB' : '#E2E8F0',
          borderRadius: 8,
          paddingVertical: 14,
          alignItems: 'center',
          marginTop: 'auto',
        }}
      >
        <Text style={{ color: isAnswered ? '#fff' : '#94A3B8', fontWeight: '600' }}>
          {currentIdx === questions.length - 1 ? 'Hoàn thành' : 'Câu tiếp theo'}
        </Text>
      </Pressable>
    </View>
  );
}

type WorkspaceMode = 'browse' | 'study';

function FlashcardWorkspace({ materialId, initialCards }: { materialId: number; initialCards: FlashcardCard[] }) {
  const [mode, setMode] = useState<WorkspaceMode>('study');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
        <ModeTab label="Ôn tập" active={mode === 'study'} onPress={() => setMode('study')} />
        <ModeTab label="Xem tất cả" active={mode === 'browse'} onPress={() => setMode('browse')} />
      </View>
      {mode === 'study' ? (
        <FlashcardStudy materialId={materialId} initialCards={initialCards} />
      ) : (
        <FlashcardBrowse cards={initialCards} />
      )}
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
      <Text style={{ color: active ? '#2563EB' : '#64748B', fontWeight: active ? '700' : '500' }}>{label}</Text>
    </Pressable>
  );
}

/** Ôn tập kiểu Anki (SM-2) — cổng từ `fe/components/materials/FlashcardStudyMode.tsx`, bỏ phát
 * âm (Web Speech API không có trên RN) và điều chỉnh cỡ chữ để giữ màn đơn giản. */
function FlashcardStudy({ materialId, initialCards }: { materialId: number; initialCards: FlashcardCard[] }) {
  const queryClient = useQueryClient();
  const cards = initialCards;
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [isFlipped, setIsFlipped] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: ({ flashcardId, quality }: { flashcardId: number; quality: number }) =>
      flashcardsApi.review(flashcardId, quality),
    onSuccess: (_, { flashcardId }) => {
      setCompletedIds((prev) => new Set(prev).add(flashcardId));
      setIsFlipped(false);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['material', materialId] }),
  });

  const newCards = cards.filter((c) => c.isDue && c.repetitions === 0 && !completedIds.has(c.id));
  const learningCards = cards.filter((c) => c.isDue && c.repetitions > 0 && c.repetitions < 3 && !completedIds.has(c.id));
  const reviewCards = cards.filter((c) => c.isDue && c.repetitions >= 3 && !completedIds.has(c.id));
  const dueCards = [...newCards, ...learningCards, ...reviewCards];
  const currentCard = dueCards[0] ?? null;

  if (!currentCard) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <CheckCircle2 size={48} color="#16A34A" strokeWidth={1.5} />
        <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center' }}>Đã ôn hết thẻ cần ôn hôm nay!</Text>
        <Text style={{ color: '#64748B', textAlign: 'center' }}>Quay lại sau khi có thẻ mới cần ôn.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={{ color: '#2563EB', fontWeight: '600' }}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  const fmt = (deltaMs: number) => {
    if (deltaMs < 3_600_000) return `${Math.round(deltaMs / 60_000)} phút`;
    if (deltaMs < 86_400_000) return `${Math.round(deltaMs / 3_600_000)} giờ`;
    return `${Math.round(deltaMs / 86_400_000)} ngày`;
  };
  const ratingButtons = [
    { label: 'Khó quá', quality: 0, delta: 1 * 60_000, color: '#DC2626' },
    { label: 'Khó', quality: 2, delta: 6 * 60_000, color: '#D97706' },
    { label: 'Tốt', quality: 3, delta: 10 * 60_000, color: '#16A34A' },
    { label: 'Dễ', quality: 5, delta: 3 * 86_400_000, color: '#2563EB' },
  ];

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: '#2563EB', fontWeight: '700' }}>{newCards.length}</Text>
        <Text style={{ color: '#94A3B8' }}>+</Text>
        <Text style={{ color: '#D97706', fontWeight: '700' }}>{learningCards.length}</Text>
        <Text style={{ color: '#94A3B8' }}>+</Text>
        <Text style={{ color: '#16A34A', fontWeight: '700' }}>{reviewCards.length}</Text>
      </View>

      <Pressable
        onPress={() => setIsFlipped((f) => !f)}
        style={{
          flex: 1,
          borderRadius: 12,
          padding: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isFlipped ? '#2563EB' : '#F8FAFC',
          borderWidth: isFlipped ? 0 : 1,
          borderColor: '#E2E8F0',
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: '600',
            textAlign: 'center',
            color: isFlipped ? '#fff' : '#0F172A',
          }}
        >
          {isFlipped ? currentCard.backText : currentCard.frontText}
        </Text>
        {!isFlipped ? (
          <Text style={{ marginTop: 16, color: '#94A3B8', fontSize: 12 }}>Chạm để xem đáp án</Text>
        ) : null}
      </Pressable>

      {isFlipped ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          {ratingButtons.map((btn) => (
            <Pressable
              key={btn.label}
              onPress={() => reviewMutation.mutate({ flashcardId: currentCard.id, quality: btn.quality })}
              disabled={reviewMutation.isPending}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <CalendarClock size={10} color="#94A3B8" />
                <Text style={{ fontSize: 10, color: '#94A3B8' }}>{fmt(btn.delta)}</Text>
              </View>
              <View style={{ backgroundColor: btn.color, borderRadius: 8, paddingVertical: 10, width: '100%', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{btn.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Duyệt toàn bộ thẻ (không tính SRS) — cổng rút gọn từ `FlashcardViewer.tsx`, bỏ TTS/sửa/xoá
 * (chỉ xem, đúng quyền học viên trên app — sửa/xoá vẫn làm trên Web). */
function FlashcardBrowse({ cards }: { cards: FlashcardCard[] }) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const card = cards[index];

  if (!card) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#64748B' }}>Bộ thẻ này chưa có thẻ nào.</Text>
      </View>
    );
  }

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(cards.length - 1, next)));
    setIsFlipped(false);
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ textAlign: 'center', color: '#64748B' }}>
        {index + 1}/{cards.length}
      </Text>
      <Pressable
        onPress={() => setIsFlipped((f) => !f)}
        style={{
          flex: 1,
          borderRadius: 12,
          padding: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isFlipped ? '#2563EB' : '#F8FAFC',
          borderWidth: isFlipped ? 0 : 1,
          borderColor: '#E2E8F0',
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '600', textAlign: 'center', color: isFlipped ? '#fff' : '#0F172A' }}>
          {isFlipped ? card.backText : card.frontText}
        </Text>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable onPress={() => goTo(index - 1)} disabled={index === 0} style={{ opacity: index === 0 ? 0.3 : 1 }}>
          <ChevronLeft size={28} color="#2563EB" />
        </Pressable>
        <Pressable onPress={() => goTo(index + 1)} disabled={index === cards.length - 1} style={{ opacity: index === cards.length - 1 ? 0.3 : 1 }}>
          <ChevronRight size={28} color="#2563EB" />
        </Pressable>
      </View>
    </View>
  );
}
