import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { ExamResultView } from '@/components/ExamResultView';
import { BackButton } from '@/components/BackButton';
import { ProctoringCameraView } from '@/components/ProctoringCameraView';
import { ApiError } from '@/lib/api/client';
import { quizzesApi } from '@/lib/api/quizzes';
import type { ProctorFrameRes, QuizAttemptResult, QuizQuestion, ViolationRes } from '@/types/quiz';

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ExamScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  // Mốc giờ kết thúc tuyệt đối (không phải đếm lùi cộng dồn) — tính 1 lần trong effect khi
  // biết thời lượng, giữ nguyên dù component re-render do query/mutation khác đổi state.
  const [examEndsAt, setExamEndsAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const autoSubmittedRef = useRef(false);

  const { data: attempt, isLoading, error, refetch } = useQuery({
    queryKey: ['exam-attempt', quizId],
    queryFn: () => quizzesApi.startAttempt(Number(quizId)),
    enabled: !!quizId,
    staleTime: Infinity,
  });

  const submitMutation = useMutation({
    mutationFn: () => quizzesApi.submitAttempt(attempt!.attemptId, answers),
    onSuccess: (res) => setResult(res),
  });

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
      // Đồng bộ state với đồng hồ hệ thống (external system) đúng 1 lần khi biết thời lượng —
      // không có cách nào tính mốc giờ này một cách thuần (pure) trong lúc render vì Date.now()
      // vốn impure, nên effect là chỗ hợp lệ duy nhất để gọi.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExamEndsAt(Date.now() + attempt.durationMinutes * 60_000);
    }
  }, [attempt?.durationMinutes, examEndsAt]);

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
          <Text style={{ color: '#2563EB' }}>Thử lại</Text>
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
        <Text style={{ color: '#475569' }}>
          Đã trả lời {answeredCount}/{attempt.questions.length} câu
        </Text>
        {remainingSec !== null ? (
          <Text style={{ fontWeight: '700', color: remainingSec < 60 ? '#DC2626' : '#0F172A' }}>
            {formatClock(Math.max(0, remainingSec))}
          </Text>
        ) : null}
      </View>

      {attempt.questions.map((q, idx) => (
        <View key={q.id} style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>
            Câu {idx + 1}. {q.content}
          </Text>
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
                  borderColor: selected ? '#2563EB' : '#CBD5E1',
                  backgroundColor: selected ? '#EFF6FF' : '#fff',
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
                    borderColor: selected ? '#2563EB' : '#94A3B8',
                    backgroundColor: selected ? '#2563EB' : 'transparent',
                  }}
                />
                <Text style={{ flex: 1 }}>{opt.content}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {submitMutation.isError ? (
        <Text style={{ color: '#DC2626' }}>
          {submitMutation.error instanceof ApiError ? submitMutation.error.message : 'Nộp bài thất bại, vui lòng thử lại.'}
        </Text>
      ) : null}

        <Pressable
          onPress={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center', opacity: submitMutation.isPending ? 0.6 : 1 }}
        >
          {submitMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Nộp bài</Text>}
        </Pressable>
      </ScrollView>

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
