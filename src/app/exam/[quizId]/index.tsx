import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { Flag } from 'lucide-react-native';

import { ExamResultView } from '@/components/ExamResultView';
import { BackButton } from '@/components/BackButton';
import { ProctoringCameraView } from '@/components/ProctoringCameraView';
import { ApiError } from '@/lib/api/client';
import { quizzesApi } from '@/lib/api/quizzes';
import { readDraft, removeDraft, writeDraft } from '@/lib/draftStore';
import type { ProctorFrameRes, QuizAttemptResult, QuizQuestion, ViolationRes } from '@/types/quiz';
import { COLORS } from '@/lib/theme/colors';

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ExamScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  // Mốc giờ kết thúc tuyệt đối (không phải đếm lùi cộng dồn) — tính 1 lần trong effect khi
  // biết thời lượng, giữ nguyên dù component re-render do query/mutation khác đổi state.
  const [examEndsAt, setExamEndsAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const autoSubmittedRef = useRef(false);

  const { data: attempt, isLoading, error, refetch } = useQuery({
    queryKey: ['exam-attempt', quizId],
    queryFn: () => quizzesApi.startAttempt(Number(quizId)),
    enabled: !!quizId,
    // Không refetch giữa lúc đang thi, nhưng xoá cache ngay khi rời màn hình (gcTime 0) — nếu không, vào
    // làm lượt MỚI sẽ dính lượt cũ đã nộp (cùng lỗi `state cũ` đã sửa ở web).
    staleTime: Infinity,
    gcTime: 0,
  });

  const submitMutation = useMutation({
    mutationFn: () => quizzesApi.submitAttempt(attempt!.attemptId, answers),
    onSuccess: (res) => {
      if (attempt) removeDraft(`exam_${attempt.attemptId}`);
      setResult(res);
    },
  });

  // Khôi phục nháp đáp án (app bị đóng/văng giữa chừng) và lưu nháp mỗi khi đổi đáp án.
  const draftLoadedRef = useRef(false);
  useEffect(() => {
    if (!attempt || draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    void readDraft<{ answers: Record<number, number[]>; flagged: Record<number, boolean> }>(`exam_${attempt.attemptId}`).then((d) => {
      if (d?.answers) setAnswers(d.answers);
      if (d?.flagged) setFlagged(d.flagged);
    });
  }, [attempt]);
  useEffect(() => {
    if (!attempt || !draftLoadedRef.current || result) return;
    writeDraft(`exam_${attempt.attemptId}`, { answers, flagged });
  }, [answers, flagged, attempt, result]);

  // Chặn nút Back của Android trong lúc làm bài — chỉ thoát bằng cách nộp bài (đáp án nháp vẫn được giữ nếu app bị đóng).
  useEffect(() => {
    if (result) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Đang làm bài', 'Bạn chỉ có thể rời bài thi bằng cách nộp bài.');
      return true;
    });
    return () => sub.remove();
  }, [result]);

  const uploadVideoMutation = useMutation({
    mutationFn: ({ fileUri, durationSec }: { fileUri: string; durationSec: number }) => 
      quizzesApi.uploadRecording(attempt!.attemptId, fileUri, durationSec),
  });

  // Vi phạm từ 2 nguồn: `onViolation` (hành vi phía client, vd TAB_SWITCH) và `onProctorResult`
  // (hình ảnh, BE/Gemini Vision xác thực) — cùng chung format response `{violationCount,
  // maxViolations, shouldAutoSubmit}` nên dùng 1 hàm xử lý chung (port từ `fe`'s `handleViolation`
  // — trước đây mobile BỎ QUA response này hoàn toàn, khiến auto-submit khi vượt số lần vi phạm
  // không bao giờ xảy ra dù BE đã đếm đúng).
  const handleAutoSubmitCheck = (res: ViolationRes, reason: string) => {
    if (autoSubmittedRef.current) return;
    if (res.shouldAutoSubmit) {
      autoSubmittedRef.current = true;
      Alert.alert('Vi phạm quá số lần cho phép', `Bạn đã vi phạm quá ${res.maxViolations ?? 3} lần. Hệ thống tự động nộp bài!`);
      submitMutation.mutate();
    } else {
      Alert.alert('Cảnh báo vi phạm', `(${res.violationCount}/${res.maxViolations ?? 3}): ${reason}`);
    }
  };

  const handleViolation = (type: string, detail: string) => {
    if (!attempt || result) return;
    quizzesApi.recordViolation(attempt.attemptId, { type, detail })
      .then((res) => handleAutoSubmitCheck(res, detail))
      .catch(() => {});
  };

  const handleProctorResult = (res: ProctorFrameRes) => {
    if (!attempt || result || !res.flagged) return;
    handleAutoSubmitCheck(res, 'bất thường camera (AI Vision)');
  };

  useEffect(() => {
    if (attempt?.durationMinutes && examEndsAt === null) {
      // Mốc kết thúc tính từ `startedAt` của BE (nguồn thật) để vào lại bài vẫn đúng giờ còn lại; nếu giờ máy
      // lệch múi/giờ khiến mốc vô lý thì rơi về đầy đủ thời lượng tính từ bây giờ.
      const full = attempt.durationMinutes * 60_000;
      const startedMs = attempt.startedAt ? new Date(attempt.startedAt).getTime() : NaN;
      const elapsed = Date.now() - startedMs;
      const useServer = Number.isFinite(startedMs) && elapsed >= 0 && elapsed <= full;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExamEndsAt(useServer ? startedMs + full : Date.now() + full);
    }
  }, [attempt?.durationMinutes, attempt?.startedAt, examEndsAt]);

  // Tick mỗi giây đọc lại đồng hồ thật (tránh cộng dồn sai số của đếm lùi từng giây) — setState
  // chỉ gọi bên trong callback của setInterval, không gọi trực tiếp trong thân effect.
  useEffect(() => {
    if (examEndsAt === null || result) return;
    const interval = setInterval(() => {
      const secLeft = Math.round((examEndsAt - Date.now()) / 1000);
      setRemainingSec(secLeft);
      if (secLeft <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        submitMutation.mutate();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examEndsAt, result]);

  const toggleAnswer = (question: QuizQuestion, optionId: number) => {
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.isMultipleChoice) {
        const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
        return { ...prev, [question.id]: next };
      }
      return { ...prev, [question.id]: [optionId] };
    });
  };

  const answeredCount = useMemo(() => Object.values(answers).filter((a) => a.length > 0).length, [answers]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !attempt) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text>{error instanceof ApiError ? error.message : 'Không tải được bài thi.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: COLORS.accent }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  // (Đã xóa block: Mobile giờ đã hỗ trợ giám sát camera)

  if (result) {
    return <ExamResultView result={result} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Stack.Screen options={{ headerShown: true, title: 'Bài thi', headerLeft: () => null }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: COLORS.inkMuted }}>
          Đã trả lời {answeredCount}/{attempt.questions.length} câu
        </Text>
        {remainingSec !== null ? (
          <Text style={{ fontWeight: '700', color: remainingSec < 60 ? COLORS.danger : COLORS.ink }}>
            {formatClock(Math.max(0, remainingSec))}
          </Text>
        ) : null}
      </View>

      {attempt.questions.map((q, idx) => (
        <View key={q.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={{ fontWeight: '600', flex: 1 }}>
              Câu {idx + 1}. {q.content}
            </Text>
            <Pressable onPress={() => setFlagged((prev) => ({ ...prev, [q.id]: !prev[q.id] }))} hitSlop={8}>
              <Flag size={18} color={flagged[q.id] ? COLORS.danger : COLORS.lineDot} fill={flagged[q.id] ? COLORS.danger : 'transparent'} />
            </Pressable>
          </View>
          {q.options.map((opt) => {
            const selected = (answers[q.id] ?? []).includes(opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => toggleAnswer(q, opt.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  borderWidth: 1,
                  borderColor: selected ? COLORS.accent : COLORS.line,
                  backgroundColor: selected ? COLORS.tint : '#fff',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: q.isMultipleChoice ? 4 : 9,
                    borderWidth: 2,
                    borderColor: selected ? COLORS.accent : COLORS.lineDot,
                    backgroundColor: selected ? COLORS.accent : 'transparent',
                  }}
                />
                <Text style={{ flex: 1 }}>{opt.content}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {submitMutation.isError ? (
        <Text style={{ color: COLORS.danger }}>
          {submitMutation.error instanceof ApiError ? submitMutation.error.message : 'Nộp bài thất bại, vui lòng thử lại.'}
        </Text>
      ) : null}

        <Pressable
          onPress={() => {
            const unanswered = attempt.questions.length - answeredCount;
            const flaggedCount = Object.values(flagged).filter(Boolean).length;
            const notes = [
              unanswered > 0 ? `Còn ${unanswered} câu chưa trả lời.` : 'Bạn đã trả lời đủ các câu.',
              flaggedCount > 0 ? `${flaggedCount} câu đang đánh dấu cần xem lại.` : null,
            ].filter(Boolean).join('\n');
            Alert.alert('Xác nhận nộp bài', `${notes}\nNộp bài ngay?`, [
              { text: 'Làm tiếp', style: 'cancel' },
              { text: 'Nộp bài', style: 'destructive', onPress: () => submitMutation.mutate() },
            ]);
          }}
          disabled={submitMutation.isPending}
          style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: 'center', opacity: submitMutation.isPending ? 0.6 : 1 }}
        >
          {submitMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Nộp bài</Text>}
        </Pressable>
      </ScrollView>

      {submitMutation.isPending ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,37,64,0.7)', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Đang nộp bài, vui lòng đợi...</Text>
        </View>
      ) : null}

      {attempt.isProctored && (
        <View style={{ display: result ? 'none' : 'flex', position: 'absolute' }}>
          <ProctoringCameraView
            attemptId={attempt.attemptId}
            isStarted={!result}
            onViolation={handleViolation}
            onRecordingReady={(uri, duration) => uploadVideoMutation.mutate({ fileUri: uri, durationSec: duration })}
            onProctorResult={handleProctorResult}
          />
        </View>
      )}
    </View>
  );
}
