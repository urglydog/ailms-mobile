import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { flashcardsApi } from '@/lib/api/flashcards';
import { materialsApi } from '@/lib/api/materials';
import { MindmapView } from '@/components/material/MindmapView';
import type { FlashcardCard } from '@/types/material';

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
      <Stack.Screen options={{ headerShown: true, title: material.title || 'Học liệu' }} />
      {material.materialType === 'MINDMAP' && material.mermaidCode ? (
        <MindmapView mermaidCode={material.mermaidCode} />
      ) : null}
      {material.materialType === 'FLASHCARD' && material.flashcards ? (
        <FlashcardWorkspace materialId={materialId} initialCards={material.flashcards} />
      ) : null}
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
