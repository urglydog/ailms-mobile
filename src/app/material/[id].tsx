import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ListChecks, Pencil, Trash2, Volume2, X } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import type { Href } from 'expo-router';

import { ApiError } from '@/lib/api/client';
import { flashcardsApi } from '@/lib/api/flashcards';
import { materialsApi } from '@/lib/api/materials';
import { flashcardDb } from '@/lib/db/flashcardDb';
import { syncService } from '@/lib/db/syncService';
import { saveAndShareDataUrl } from '@/lib/files';
import { MindmapView, type MindmapViewHandle } from '@/components/material/MindmapView';
import { MindmapToolbar } from '@/components/material/MindmapToolbar';
import type { MermaidDirection } from '@/components/material/mermaidHtml';
import { QuizPersonalEditor } from '@/components/material/QuizPersonalEditor';
import { ExplainWrongAnswer } from '@/components/quiz/ExplainWrongAnswer';
import { BackButton } from '@/components/BackButton';
import type { FlashcardCard, MaterialDetail, QuizQuestion } from '@/types/material';

/** BE có bug data (12/10/2026, rà soát bởi user): quiz cá nhân tạo ở scope KHÓA HỌC/CHƯƠNG (không
 * phải CUSTOM_LESSONS) bị mặc định `quizType='OFFICIAL_EXAM'` dù chưa từng được publish chính
 * thức — khiến quiz cá nhân hiện nhãn/mở nhầm vào `ExamEntry`, bấm "Bắt đầu làm bài" bị BE từ chối
 * (`isOfficial=false` thật, nhưng FE chỉ check `quizType`). Field `isOfficial` (BE mới trả thêm,
 * xem `MaterialDetailRes`) mới là nguồn xác thực — chỉ coi là thi chính thức khi CẢ 2 đúng, để vẫn
 * mở đúng chế độ "Làm bài/Soạn câu hỏi" cho các quiz cá nhân cũ đã lỡ bị gắn sai `quizType` trong
 * DB (không cần chờ sửa data mới hoạt động đúng). */
function isRealOfficialExam(material: MaterialDetail): boolean {
  return material.quizType === 'OFFICIAL_EXAM' && !!material.isOfficial;
}

export default function MaterialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const materialId = Number(id);

  const { data: material, isLoading, error, refetch } = useQuery({
    queryKey: ['material', materialId],
    queryFn: async () => {
      const data = await materialsApi.getDetail(materialId);
      if (data.materialType === 'FLASHCARD' && data.flashcards) {
        await flashcardDb.syncMaterialFlashcards(materialId, data.flashcards);
      }
      return data;
    },
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
        <MindmapSection materialId={materialId} initialMermaidCode={material.mermaidCode} onSaved={() => refetch()} />
      ) : null}
      {material.materialType === 'FLASHCARD' && material.flashcards ? (
        <FlashcardWorkspace materialId={materialId} initialCards={material.flashcards} language={material.language} />
      ) : null}
      {material.materialType === 'QUIZ' ? (
        isRealOfficialExam(material) && material.quizId ? (
          <ExamEntry quizId={material.quizId} />
        ) : material.quizQuestions ? (
          <LectureQuizWorkspace
            questions={material.quizQuestions}
            quizId={material.quizId}
            materialId={materialId}
            isOfficial={!!material.isOfficial}
          />
        ) : null
      ) : null}
    </View>
  );
}

/** Bọc toolbar (xoay hướng/copy code/tải SVG) quanh `MindmapView` — port từ
 * `fe/components/materials/MermaidViewer.tsx`. `direction`/`ready` sống ở đây (không trong
 * `MindmapView`) vì `mermaidCode` cần sẵn cho nút Copy Code. */
function MindmapSection({ materialId, initialMermaidCode, onSaved }: { materialId: number; initialMermaidCode: string; onSaved: () => void }) {
  const [mermaidCode, setMermaidCode] = useState(initialMermaidCode);
  const [direction, setDirection] = useState<MermaidDirection | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const mindmapRef = useRef<MindmapViewHandle>(null);

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(mermaidCode);
      Alert.alert('Đã sao chép', 'Mã Mermaid đã được sao chép.');
    } catch {
      Alert.alert('Lỗi', 'Không sao chép được mã.');
    }
  };

  const handleImageExtracted = async (dataUrl: string | null) => {
    if (!dataUrl) {
      Alert.alert('Lỗi', 'Không thể xuất sơ đồ.');
      return;
    }
    try {
      await saveAndShareDataUrl(dataUrl, 'mindmap.png', 'image/png');
    } catch (err) {
      console.error('Lưu sơ đồ thất bại:', err);
      Alert.alert('Lỗi', 'Không thể lưu sơ đồ.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MindmapToolbar
        direction={direction}
        onDirectionChange={(d) => {
          setReady(false);
          setDirection(d);
        }}
        onCopyCode={handleCopyCode}
        onDownload={() => mindmapRef.current?.requestImage()}
        onEdit={() => setEditing(true)}
        downloadDisabled={!ready}
      />
      <MindmapView
        ref={mindmapRef}
        mermaidCode={mermaidCode}
        direction={direction}
        onImageExtracted={handleImageExtracted}
        onReady={() => setReady(true)}
      />

      {editing ? (
        <EditMermaidCodeModal
          materialId={materialId}
          code={mermaidCode}
          onClose={() => setEditing(false)}
          onSaved={(newCode) => {
            setMermaidCode(newCode);
            setReady(false);
            setEditing(false);
            onSaved();
          }}
        />
      ) : null}
    </View>
  );
}

/** Port rút gọn (chỉ sửa text) từ `fe/components/materials/MermaidCodeEditor.tsx` — web có thêm
 * preview trực tiếp trong lúc gõ, mobile bỏ qua phần đó (ngoài phạm vi MVP), chỉ sửa xong bấm Lưu
 * mới thấy kết quả (dùng lại `MindmapView` có sẵn). */
function EditMermaidCodeModal({ materialId, code, onClose, onSaved }: { materialId: number; code: string; onClose: () => void; onSaved: (code: string) => void }) {
  const [value, setValue] = useState(code);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) {
      Alert.alert('Lỗi', 'Code Mermaid không được để trống.');
      return;
    }
    setSaving(true);
    try {
      await materialsApi.updateMaterial(materialId, { mermaidCode: value });
      onSaved(value);
    } catch (err) {
      Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Không lưu được code.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent presentationStyle="overFullScreen" animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ height: '80%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Sửa code Mermaid</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color="#64748B" />
            </Pressable>
          </View>
          <TextInput
            value={value}
            onChangeText={setValue}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 12.5, fontFamily: 'monospace', textAlignVertical: 'top' }}
          />
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{ alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563EB', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Lưu</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
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

/** Bọc ngoài `LectureQuiz` thêm tab "Soạn câu hỏi" (`QuizPersonalEditor`, 12/10/2026) — CHỈ hiện
 * khi `!isOfficial` (quiz cá nhân của chính học viên), khớp `fe`'s gating
 * `!isOfficial && material.quizQuestions...` ở `app/(student)/materials/[id]/page.tsx`. Học liệu
 * Official chỉ có đúng 1 chế độ (làm bài), không có tab để chuyển. */
function LectureQuizWorkspace({
  questions, quizId, materialId, isOfficial,
}: {
  questions: QuizQuestion[];
  quizId: number | undefined;
  materialId: number;
  isOfficial: boolean;
}) {
  const [mode, setMode] = useState<'study' | 'edit'>('study');
  const canEdit = !isOfficial && !!quizId && questions.length > 0;

  return (
    <View style={{ flex: 1 }}>
      {canEdit ? (
        <View style={{ flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable onPress={() => setMode('study')} style={{ paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: mode === 'study' ? '#2563EB' : 'transparent' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'study' ? '#2563EB' : '#64748B' }}>📖 Làm bài</Text>
          </Pressable>
          <Pressable onPress={() => setMode('edit')} style={{ paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: mode === 'edit' ? '#2563EB' : 'transparent' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: mode === 'edit' ? '#2563EB' : '#64748B' }}>📋 Soạn câu hỏi</Text>
          </Pressable>
        </View>
      ) : null}

      {mode === 'edit' && canEdit && quizId ? (
        <View style={{ flex: 1, padding: 16 }}>
          <QuizPersonalEditor questions={questions} quizId={quizId} materialId={materialId} />
        </View>
      ) : (
        <LectureQuiz questions={questions} />
      )}
    </View>
  );
}

/** QUIZ loại LECTURE_QUIZ (ôn tập nhanh) — làm trực tiếp tại chỗ, KHÔNG tính giờ, không giới hạn
 * số lần, không gửi kết quả lên BE (đúng hành vi bản Web `QuizViewer.tsx` — chấm điểm thuần phía
 * client, không có "lượt làm bài" nào được lưu). (12/10/2026) Đã bổ sung "Hỏi Gia sư AI tại sao
 * sai" (`ExplainWrongAnswer`) — vẫn bỏ lưu draft (localStorage) của bản Web để giữ scope gọn. */
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

      {isAnswered && !selectedIsCorrect ? (
        <ExplainWrongAnswer questionId={question.id} selectedOptionId={selectedOptionId} />
      ) : null}

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

function FlashcardWorkspace({ materialId, initialCards, language }: { materialId: number; initialCards: FlashcardCard[]; language: string }) {
  const [mode, setMode] = useState<WorkspaceMode>('study');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
        <ModeTab label="Ôn tập" active={mode === 'study'} onPress={() => setMode('study')} />
        <ModeTab label="Xem tất cả" active={mode === 'browse'} onPress={() => setMode('browse')} />
      </View>
      {mode === 'study' ? (
        <FlashcardStudy materialId={materialId} initialCards={initialCards} language={language} />
      ) : (
        <FlashcardBrowse cards={initialCards} language={language} />
      )}
    </View>
  );
}

/** Khớp `LANGUAGE_MAP` bên `fe/components/materials/FlashcardStudyMode.tsx` — map mã ngôn ngữ
 * ngắn (`language` của học liệu) sang BCP-47 cho TTS. Web dùng Web Speech API (chỉ có trên
 * browser); mobile dùng `expo-speech` (chạy được cả Expo Go, không cần native linking) — cùng
 * bảng mã, chỉ khác API gọi phát âm bên dưới. */
const SPEECH_LANGUAGE_MAP: Record<string, string> = {
  vi: 'vi-VN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR',
  zh: 'zh-CN', fr: 'fr-FR', de: 'de-DE', es: 'es-ES',
  pt: 'pt-PT', ru: 'ru-RU', th: 'th-TH', id: 'id-ID',
};

function speakFlashcardText(text: string, language: string | undefined) {
  const langCode = language?.toLowerCase().split('-')[0] ?? '';
  const bcp47 = SPEECH_LANGUAGE_MAP[langCode];
  if (!bcp47) return;
  Speech.stop();
  Speech.speak(text, { language: bcp47 });
}

/** Nút loa góc trên-phải của thẻ — đặt làm sibling SAU `Pressable` lật thẻ (không lồng bên
 * trong) để nhận touch trước, tránh vừa phát âm vừa lật thẻ cùng lúc. */
function SpeakButton({ text, language, dark }: { text: string; language: string | undefined; dark?: boolean }) {
  const langCode = language?.toLowerCase().split('-')[0] ?? '';
  if (!SPEECH_LANGUAGE_MAP[langCode]) return null;
  return (
    <Pressable
      onPress={() => speakFlashcardText(text, language)}
      hitSlop={8}
      style={{
        position: 'absolute', top: 12, right: 12, padding: 8, borderRadius: 999,
        backgroundColor: dark ? 'rgba(255,255,255,0.15)' : '#F1F5F9',
      }}
    >
      <Volume2 size={18} color={dark ? '#fff' : '#475569'} strokeWidth={1.75} />
    </Pressable>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
      <Text style={{ color: active ? '#2563EB' : '#64748B', fontWeight: active ? '700' : '500' }}>{label}</Text>
    </Pressable>
  );
}

/** Ôn tập kiểu Anki (SM-2) — cổng từ `fe/components/materials/FlashcardStudyMode.tsx`. (12/10/2026)
 * đã bổ sung phát âm bằng `expo-speech` (trước đây bỏ vì Web Speech API không có trên RN) — vẫn
 * bỏ điều chỉnh cỡ chữ để giữ màn đơn giản. */
function FlashcardStudy({ materialId, initialCards, language }: { materialId: number; initialCards: FlashcardCard[]; language: string }) {
  const queryClient = useQueryClient();
  const { data: cards = initialCards, refetch } = useQuery({
    queryKey: ['offline-flashcards', materialId],
    queryFn: () => flashcardDb.getOfflineFlashcards(materialId),
  });
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [isFlipped, setIsFlipped] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: async ({ flashcardId, quality }: { flashcardId: number; quality: number }) => {
      await flashcardDb.recordReview(flashcardId, quality);
      syncService.syncOfflineReviews().catch(console.error); // Sync ngầm
    },
    onSuccess: (_, { flashcardId }) => {
      setCompletedIds((prev) => new Set(prev).add(flashcardId));
      setIsFlipped(false);
    },
    onSettled: () => refetch(),
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
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: '#2563EB', fontWeight: '700' }}>{newCards.length}</Text>
        <Text style={{ color: '#94A3B8' }}>+</Text>
        <Text style={{ color: '#D97706', fontWeight: '700' }}>{learningCards.length}</Text>
        <Text style={{ color: '#94A3B8' }}>+</Text>
        <Text style={{ color: '#16A34A', fontWeight: '700' }}>{reviewCards.length}</Text>
      </View>

      <View style={{ height: 280, position: 'relative' }}>
        <Pressable
          onPress={() => {
            Speech.stop();
            setIsFlipped((f) => !f);
          }}
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
        <SpeakButton text={isFlipped ? currentCard.backText : currentCard.frontText} language={language} dark={isFlipped} />
      </View>

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

/** Duyệt toàn bộ thẻ (không tính SRS) — cổng rút gọn từ `FlashcardViewer.tsx`, bỏ sửa/xoá (chỉ
 * xem, đúng quyền học viên trên app — sửa/xoá vẫn làm trên Web). (12/10/2026) đã bổ sung phát âm
 * (trước đây bỏ cùng lúc với sửa/xoá, nhưng phát âm không liên quan quyền chỉnh sửa gì cả). */
function FlashcardBrowse({ cards: initialCards, language }: { cards: FlashcardCard[]; language: string }) {
  const [cards, setCards] = useState(initialCards);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const card = cards[index];

  const handleDelete = () => {
    if (!card) return;
    Alert.alert('Xoá thẻ này?', 'Không thể hoàn tác.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await flashcardsApi.delete(card.id);
            setCards((prev) => prev.filter((c) => c.id !== card.id));
            setIndex((i) => Math.max(0, Math.min(i, cards.length - 2)));
          } catch (err) {
            Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Không xoá được thẻ.');
          }
        },
      },
    ]);
  };

  if (!card) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#64748B' }}>Bộ thẻ này chưa có thẻ nào.</Text>
      </View>
    );
  }

  const goTo = (next: number) => {
    Speech.stop();
    setIndex(Math.max(0, Math.min(cards.length - 1, next)));
    setIsFlipped(false);
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
      <Text style={{ textAlign: 'center', color: '#64748B' }}>
        {index + 1}/{cards.length}
      </Text>
      <View style={{ height: 280, position: 'relative' }}>
        <Pressable
          onPress={() => {
            Speech.stop();
            setIsFlipped((f) => !f);
          }}
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
        <SpeakButton text={isFlipped ? card.backText : card.frontText} language={language} dark={isFlipped} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable onPress={() => goTo(index - 1)} disabled={index === 0} style={{ opacity: index === 0 ? 0.3 : 1 }}>
          <ChevronLeft size={28} color="#2563EB" />
        </Pressable>
        <Pressable onPress={() => goTo(index + 1)} disabled={index === cards.length - 1} style={{ opacity: index === cards.length - 1 ? 0.3 : 1 }}>
          <ChevronRight size={28} color="#2563EB" />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
        <Pressable
          onPress={() => setEditing(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }}
        >
          <Pencil size={14} color="#64748B" strokeWidth={2} />
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#334155' }}>Sửa</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}
        >
          <Trash2 size={14} color="#DC2626" strokeWidth={2} />
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#DC2626' }}>Xoá</Text>
        </Pressable>
      </View>

      {editing ? (
        <EditFlashcardModal
          card={card}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setEditing(false);
          }}
        />
      ) : null}
    </View>
  );
}

function EditFlashcardModal({ card, onClose, onSaved }: { card: FlashcardCard; onClose: () => void; onSaved: (card: FlashcardCard) => void }) {
  const [frontText, setFrontText] = useState(card.frontText);
  const [backText, setBackText] = useState(card.backText);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!frontText.trim() || !backText.trim()) {
      Alert.alert('Lỗi', 'Không được để trống mặt trước/sau.');
      return;
    }
    setSaving(true);
    try {
      await flashcardsApi.update(card.id, { frontText, backText });
      onSaved({ ...card, frontText, backText });
    } catch (err) {
      Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Không lưu được thẻ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent presentationStyle="overFullScreen" animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ maxHeight: '85%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Sửa thẻ</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color="#64748B" />
            </Pressable>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>Mặt trước</Text>
            <TextInput
              value={frontText}
              onChangeText={setFrontText}
              multiline
              style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, minHeight: 60 }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>Mặt sau</Text>
            <TextInput
              value={backText}
              onChangeText={setBackText}
              multiline
              style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 14, minHeight: 60 }}
            />
          </View>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{ alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#2563EB', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Lưu</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
