import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Flag, ShieldAlert } from 'lucide-react-native';

import { ExamResultView } from '@/components/ExamResultView';
import { ExamIntro, type ExamInfo } from '@/components/exam/ExamIntro';
import { ExamReview } from '@/components/exam/ExamReview';
import { BackButton } from '@/components/BackButton';
import { ProctoringCameraView, type ProctoringHandle, type ProctoringRecording } from '@/components/ProctoringCameraView';
import { ApiError } from '@/lib/api/client';
import { quizzesApi } from '@/lib/api/quizzes';
import { readDraft, removeDraft, writeDraft } from '@/lib/draftStore';
import { enqueueRecording, flushRecordings, subscribeRecordingProgress } from '@/lib/recordingQueue';
import type { ProctorFrameRes, QuizAttemptResult, QuizQuestion, ViolationRes } from '@/types/quiz';
import { COLORS } from '@/lib/theme/colors';

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Ghi mốc bắt đầu lượt thi 1 lần (lấy `startedAt` của BE, hợp lệ thì dùng, không thì giờ hiện tại). */
function markExamStart(ref: { current: number | null }, startedAt: string | null | undefined) {
  if (ref.current !== null) return;
  const t = startedAt ? new Date(startedAt).getTime() : NaN;
  ref.current = Number.isFinite(t) && t <= Date.now() ? t : Date.now();
}

/** Số giây từ mốc `startMs` đến bây giờ (0 nếu chưa có mốc). Đặt ngoài component để lint không coi `Date.now` là gọi lúc render. */
function secondsSince(startMs: number | null): number {
  return startMs ? Math.round((Date.now() - startMs) / 1000) : 0;
}

type SubmitStage = null | 'submitting' | 'saving-video';

export default function ExamScreen() {
  const params = useLocalSearchParams<{
    quizId: string;
    title?: string;
    duration?: string;
    attempts?: string;
    count?: string;
    start?: string;
    end?: string;
    proctored?: string;
  }>();
  const quizId = Number(params.quizId);
  const info: ExamInfo = {
    title: params.title || 'Bài kiểm tra',
    durationMinutes: params.duration ? Number(params.duration) : null,
    maxAttempts: params.attempts ? Number(params.attempts) : null,
    questionCount: params.count ? Number(params.count) : null,
    startTime: params.start || null,
    endTime: params.end || null,
    isProctored: params.proctored === undefined ? null : params.proctored === 'true',
  };

  // Chỉ bắt đầu lượt thi (gọi BE tạo attempt) SAU KHI học viên bấm "Bắt đầu" ở trang giới thiệu.
  const [started, setStarted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [camPermission, requestCam] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();

  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [reviewing, setReviewing] = useState(false);
  const [submitStage, setSubmitStage] = useState<SubmitStage>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Tải video giám sát chạy NỀN sau khi đã nộp bài: kết quả hiện ngay, không chờ video (video lên chậm/đứt mạng không còn kẹt màn hình).
  const [recordingUpload, setRecordingUpload] = useState<'idle' | 'uploading' | 'done' | 'failed'>('idle');
  const [recordingError, setRecordingError] = useState('');
  // Cảnh báo vi phạm hiện bằng dải thông báo TRONG màn hình (tự tắt sau 8 giây), không dùng hộp thoại hệ thống: hộp thoại chặn giao diện cho tới khi bấm OK và
  // khiến việc giám sát (chụp ảnh camera) bị ngưng trong lúc nó đang hiện.
  const [violationNotice, setViolationNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!violationNotice) return;
    const timer = setTimeout(() => setViolationNotice(null), 8_000);
    return () => clearTimeout(timer);
  }, [violationNotice]);
  // Tiến độ tải video (0–100) và mã lượt thi đang tải, để chỉ hiện đúng tiến độ của bài vừa nộp.
  const [recordingProgress, setRecordingProgress] = useState(0);
  const recordingAttemptRef = useRef<number | null>(null);
  useEffect(
    () =>
      subscribeRecordingProgress((p) => {
        if (p.attemptId !== recordingAttemptRef.current || p.totalBytes <= 0) return;
        setRecordingProgress(Math.min(100, Math.round((p.sentBytes / p.totalBytes) * 100)));
      }),
    [],
  );
  const [violationCount, setViolationCount] = useState(0);
  const [maxViolations, setMaxViolations] = useState<number | null>(null);
  // Mốc giờ kết thúc tuyệt đối (không phải đếm lùi cộng dồn) — tính 1 lần trong effect khi
  // biết thời lượng, giữ nguyên dù component re-render do query/mutation khác đổi state.
  const [examEndsAt, setExamEndsAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const autoSubmittedRef = useRef(false);
  const camRef = useRef<ProctoringHandle>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const questionYs = useRef<Record<number, number>>({});

  const { data: history } = useQuery({
    queryKey: ['exam-history', String(quizId)],
    queryFn: () => quizzesApi.getAttemptHistory(quizId),
    enabled: Number.isFinite(quizId) && !started,
  });

  const { data: attempt, isLoading, error, refetch } = useQuery({
    queryKey: ['exam-attempt', String(quizId)],
    queryFn: () => quizzesApi.startAttempt(quizId),
    enabled: started && Number.isFinite(quizId),
    // Không refetch giữa lúc đang thi, nhưng xoá cache ngay khi rời màn hình (gcTime 0) — nếu không, vào
    // làm lượt MỚI sẽ dính lượt cũ đã nộp (cùng lỗi `state cũ` đã sửa ở web).
    staleTime: Infinity,
    gcTime: 0,
  });

  const handleStart = async () => {
    setPermissionError(null);
    // Xin quyền camera/micro TRƯỚC khi vào thi (nếu thi có giám sát) — hộp thoại xin quyền làm app tạm "inactive",
    // nếu xin lúc đang thi sẽ bị tính nhầm là rời ứng dụng.
    if (info.isProctored !== false) {
      const cam = camPermission?.granted ? camPermission : await requestCam();
      const mic = micPermission?.granted ? micPermission : await requestMic();
      if (info.isProctored === true && (!cam.granted || !mic.granted)) {
        setPermissionError('Bài thi có giám sát cần quyền Camera và Micro. Hãy cấp quyền trong Cài đặt của máy rồi thử lại.');
        return;
      }
    }
    setStarted(true);
  };

  /** Nộp bài → dừng ghi hình → tải video giám sát lên → mới hiện kết quả (camera vẫn mở suốt các bước này;
   * trước đây kết quả hiện ngay nên camera bị gỡ trước khi video kịp lưu → không có bản ghi để giám sát xem lại). */
  const doSubmit = async () => {
    if (!attempt || submitStage) return;
    setSubmitError(null);
    setSubmitStage('submitting');
    let res: QuizAttemptResult;
    try {
      res = await quizzesApi.submitAttempt(attempt.attemptId, answers);
    } catch (err) {
      setSubmitStage(null);
      autoSubmittedRef.current = false;
      setSubmitError(err instanceof ApiError ? err.message : 'Nộp bài thất bại, vui lòng thử lại.');
      return;
    }
    // Chỉ dừng ghi hình và lấy tệp (tối đa ~8 giây), rồi hiện kết quả ngay; việc tải lên chạy nền (xem `uploadRecordingInBackground`).
    setSubmitStage('saving-video');
    let rec: ProctoringRecording | null = null;
    try {
      rec = (await camRef.current?.finish()) ?? null;
    } catch {
      rec = null;
    }
    removeDraft(`exam_${attempt.attemptId}`);
    setElapsedSec(secondsSince(examStartMs.current));
    setSubmitStage(null);
    setResult(res);
    if (rec) {
      // Lưu video vào hàng đợi bền vững trước rồi mới tải: nếu đóng app/mất mạng giữa chừng, lần mở sau ứng dụng tự tải lại.
      enqueueRecording(attempt.attemptId, rec.uri, rec.durationSec);
      recordingAttemptRef.current = attempt.attemptId;
      void uploadRecordingInBackground();
    }
  };

  /** Tải mọi video giám sát đang chờ, mỗi video thử tối đa 3 lần (ngay, sau 5 giây, sau 15 giây). Thất bại hẳn thì video vẫn được giữ và tự tải lại ở lần mở app sau. */
  const uploadRecordingInBackground = async () => {
    setRecordingUpload('uploading');
    setRecordingProgress(0);
    const res = await flushRecordings(3);
    setRecordingError(res.error);
    setRecordingUpload(res.state === 'failed' ? 'failed' : 'done');
  };
  const doSubmitRef = useRef(doSubmit);
  useEffect(() => {
    doSubmitRef.current = doSubmit;
  });

  const examStartMs = useRef<number | null>(null);
  useEffect(() => {
    if (attempt) markExamStart(examStartMs, attempt.startedAt);
  }, [attempt]);

  // Giữ màn hình luôn sáng trong lúc làm bài: để máy tự khoá màn hình giữa chừng sẽ làm app tạm dừng, camera ngừng quay và bị tính là rời khỏi bài thi.
  const examRunning = !!attempt && !result;
  useEffect(() => {
    if (!examRunning) return;
    try {
      void activateKeepAwakeAsync('exam').catch(() => {});
    } catch {
      // thiết bị không hỗ trợ: bỏ qua
    }
    return () => {
      try {
        void deactivateKeepAwake('exam').catch(() => {});
      } catch {
        // bỏ qua
      }
    };
  }, [examRunning]);

  // Khôi phục nháp đáp án (app bị đóng/văng giữa chừng) và lưu nháp mỗi khi đổi đáp án.
  // `draftLoadStartedRef`: đã bắt đầu đọc nháp; `draftReadyRef`: đọc XONG. Chỉ được ghi nháp sau khi đọc xong — trước đây ghi ngay lúc vừa bắt đầu đọc
  // nên nháp rỗng đè lên nháp cũ trước khi kịp đọc (vào lại bài thi dở thì mất hết đáp án).
  const draftLoadStartedRef = useRef(false);
  const draftReadyRef = useRef(false);
  useEffect(() => {
    if (!attempt || draftLoadStartedRef.current) return;
    draftLoadStartedRef.current = true;
    void readDraft<{ answers: Record<number, number[]>; flagged: Record<number, boolean>; violationCount?: number }>(`exam_${attempt.attemptId}`)
      .then((d) => {
        if (d?.answers) setAnswers(d.answers);
        if (d?.flagged) setFlagged(d.flagged);
        // Số lần vi phạm cũng được nhớ: server khi trả bài làm dở không kèm số này, nên trước đây vào lại bài thì hiện 0 cho tới lần vi phạm kế tiếp.
        if (typeof d?.violationCount === 'number') setViolationCount((cur) => Math.max(cur, d.violationCount ?? 0));
      })
      .finally(() => {
        draftReadyRef.current = true;
      });
  }, [attempt]);
  useEffect(() => {
    if (!attempt || !draftReadyRef.current || result) return;
    writeDraft(`exam_${attempt.attemptId}`, { answers, flagged, violationCount });
  }, [answers, flagged, violationCount, attempt, result]);

  // Chặn nút Back của Android trong lúc làm bài — chỉ thoát bằng cách nộp bài (đáp án nháp vẫn được giữ nếu app bị đóng).
  useEffect(() => {
    if (!started || result) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Đang làm bài', 'Bạn chỉ có thể rời bài thi bằng cách nộp bài.');
      return true;
    });
    return () => sub.remove();
  }, [started, result]);

  // Vi phạm từ 2 nguồn: `onViolation` (hành vi phía client, vd TAB_SWITCH) và `onProctorResult`
  // (hình ảnh, BE/Gemini Vision xác thực) — cùng chung format response nên dùng 1 hàm xử lý chung.
  const handleAutoSubmitCheck = (res: ViolationRes, reason: string) => {
    setViolationCount(res.violationCount);
    if (res.maxViolations) setMaxViolations(res.maxViolations);
    if (autoSubmittedRef.current) return;
    if (res.shouldAutoSubmit) {
      autoSubmittedRef.current = true;
      setViolationNotice(`Bạn đã vi phạm quá ${res.maxViolations ?? 3} lần cho phép. Hệ thống đang tự động nộp bài.`);
      void doSubmitRef.current();
    } else {
      setViolationNotice(`Cảnh báo vi phạm (${res.violationCount}/${res.maxViolations ?? 3}): ${reason}`);
    }
  };

  const handleViolation = (type: string, detail: string) => {
    if (!attempt || result || submitStage) return;
    quizzesApi.recordViolation(attempt.attemptId, { type, detail })
      .then((res) => handleAutoSubmitCheck(res, detail))
      .catch(() => {});
  };

  const handleProctorResult = (res: ProctorFrameRes) => {
    if (!attempt || result || submitStage || !res.flagged) return;
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

  // Tick mỗi giây đọc lại đồng hồ thật — setState chỉ gọi trong callback của setInterval.
  useEffect(() => {
    if (examEndsAt === null || result) return;
    const interval = setInterval(() => {
      const secLeft = Math.round((examEndsAt - Date.now()) / 1000);
      setRemainingSec(secLeft);
      if (secLeft <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void doSubmitRef.current();
      }
    }, 1000);
    return () => clearInterval(interval);
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

  const jumpTo = (index: number) => {
    setReviewing(false);
    const q = attempt?.questions[index];
    if (!q) return;
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, (questionYs.current[q.id] ?? 0) - 8), animated: true }), 50);
  };

  // ───────── Trang giới thiệu (trước khi bắt đầu) ─────────
  if (!started) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: true, title: 'Bài thi', headerLeft: () => <BackButton /> }} />
        <ExamIntro quizId={quizId} info={info} history={history} starting={false} permissionError={permissionError} onStart={handleStart} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Stack.Screen options={{ headerShown: true, title: 'Bài thi', headerLeft: () => null }} />
        <ActivityIndicator />
        <Text style={{ color: COLORS.inkMuted }}>Đang chuẩn bị bài thi...</Text>
      </View>
    );
  }

  if (error || !attempt) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Stack.Screen options={{ headerShown: true, title: 'Bài thi', headerLeft: () => <BackButton /> }} />
        <Text style={{ color: COLORS.ink, textAlign: 'center' }}>{error instanceof ApiError ? error.message : 'Không tải được bài thi.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: COLORS.accentDark }}>Thử lại</Text>
        </Pressable>
        <Pressable onPress={() => setStarted(false)}>
          <Text style={{ color: COLORS.inkMuted }}>Quay lại trang giới thiệu</Text>
        </Pressable>
      </View>
    );
  }

  if (result) {
    return (
      <View style={{ flex: 1 }}>
        {recordingUpload !== 'idle' ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6, backgroundColor: recordingUpload === 'failed' ? COLORS.dangerTint : COLORS.tint }}>
            <Text style={{ color: recordingUpload === 'failed' ? COLORS.dangerInk : COLORS.ink, fontSize: 13, fontWeight: '600' }}>
              {recordingUpload === 'uploading'
                ? `Đang lưu bản ghi giám sát lên hệ thống (${recordingProgress}%). Bạn có thể xem kết quả ngay; vui lòng chưa đóng ứng dụng cho tới khi lưu xong.`
                : recordingUpload === 'done'
                  ? 'Đã lưu bản ghi giám sát.'
                  : 'Chưa lưu được bản ghi giám sát. Điểm bài thi không bị ảnh hưởng. Ứng dụng sẽ tự thử lại khi bạn mở lại hoặc khi có mạng; bạn cũng có thể bấm Thử lại ngay.'}
            </Text>
            {recordingUpload === 'uploading' ? (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: COLORS.line, overflow: 'hidden' }}>
                <View style={{ width: `${recordingProgress}%`, height: 6, backgroundColor: COLORS.accent }} />
              </View>
            ) : null}
            {__DEV__ && recordingUpload === 'failed' && recordingError ? (
              <Text style={{ color: COLORS.dangerInk, fontSize: 11 }}>{`Chi tiết (chỉ hiện khi chạy thử): ${recordingError}`}</Text>
            ) : null}
            {recordingUpload === 'failed' ? (
              <Pressable onPress={() => void uploadRecordingInBackground()} accessibilityLabel="Thử lưu lại bản ghi giám sát">
                <Text style={{ color: COLORS.accentDark, fontWeight: '700' }}>Thử lại</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <ExamResultView result={result} elapsedSec={elapsedSec} submittedAt={new Date()} />
      </View>
    );
  }

  const proctored = attempt.isProctored;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: info.title, headerLeft: () => null, gestureEnabled: false }} />

      {/* Thanh trạng thái: giờ còn lại, tiến độ, vi phạm */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.surfaceRaised, borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: COLORS.inkMuted, fontSize: 13 }}>Đã trả lời {answeredCount}/{attempt.questions.length}</Text>
          {proctored ? (
            <Text style={{ color: violationCount > 0 ? COLORS.danger : COLORS.inkFaint, fontSize: 12, fontWeight: '600' }}>
              Vi phạm {violationCount}/{maxViolations ?? attempt.maxViolations ?? 3}
            </Text>
          ) : null}
          {remainingSec !== null ? (
            <Text style={{ fontWeight: '800', fontSize: 16, color: remainingSec < 60 ? COLORS.danger : COLORS.ink }}>{formatClock(Math.max(0, remainingSec))}</Text>
          ) : null}
        </View>
        {!reviewing ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {attempt.questions.map((q, i) => {
              const done = (answers[q.id] ?? []).length > 0;
              return (
                <Pressable
                  key={q.id}
                  onPress={() => jumpTo(i)}
                  style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: flagged[q.id] ? COLORS.danger : done ? COLORS.accent : COLORS.line, backgroundColor: done ? COLORS.accent : COLORS.surfaceRaised }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: done ? COLORS.white : COLORS.inkMuted }}>{i + 1}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {reviewing ? (
        <ExamReview
          questions={attempt.questions}
          answers={answers}
          flagged={flagged}
          submitting={submitStage !== null}
          onJump={jumpTo}
          onBack={() => setReviewing(false)}
          onSubmit={() => void doSubmit()}
        />
      ) : (
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {proctored ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: COLORS.dangerTint, borderWidth: 1, borderColor: COLORS.dangerOnNight, borderRadius: 10, padding: 10, paddingRight: 116 }}>
              <ShieldAlert size={18} color={COLORS.danger} />
              <Text style={{ flex: 1, color: COLORS.dangerInk, fontSize: 12 }}>Bài thi có giám sát: đang quay video bằng camera. Không rời khỏi ứng dụng.</Text>
            </View>
          ) : null}

          {attempt.questions.map((q, idx) => (
            <View key={q.id} style={{ gap: 8 }} onLayout={(e) => { questionYs.current[q.id] = e.nativeEvent.layout.y; }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Text style={{ color: COLORS.ink, fontWeight: '600', flex: 1 }}>
                  Câu {idx + 1}. {q.content}
                </Text>
                <Pressable onPress={() => setFlagged((prev) => ({ ...prev, [q.id]: !prev[q.id] }))} hitSlop={8}>
                  <Flag size={18} color={flagged[q.id] ? COLORS.danger : COLORS.lineDot} fill={flagged[q.id] ? COLORS.danger : 'transparent'} />
                </Pressable>
              </View>
              {q.isMultipleChoice ? <Text style={{ fontSize: 11.5, color: COLORS.inkFaint }}>Chọn một hoặc nhiều đáp án</Text> : null}
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
                      backgroundColor: selected ? COLORS.tint : COLORS.surfaceRaised,
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
                    <Text style={{ color: COLORS.ink, flex: 1 }}>{opt.content}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {submitError ? <Text style={{ color: COLORS.danger }}>{submitError}</Text> : null}

          <Pressable
            onPress={() => setReviewing(true)}
            disabled={submitStage !== null}
            style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: 'center' }}
          >
            <Text style={{ color: COLORS.white, fontWeight: '700' }}>Xem lại & nộp bài</Text>
          </Pressable>
        </ScrollView>
      )}

      {submitError && reviewing ? <Text style={{ color: COLORS.danger, padding: 12 }}>{submitError}</Text> : null}

      {violationNotice && !submitStage ? (
        <Pressable
          onPress={() => setViolationNotice(null)}
          accessibilityLabel="Đóng cảnh báo vi phạm"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, backgroundColor: COLORS.danger, paddingHorizontal: 16, paddingVertical: 12 }}
        >
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13.5 }}>{violationNotice}</Text>
          <Text style={{ color: COLORS.white, opacity: 0.85, fontSize: 11.5, marginTop: 2 }}>Chạm để đóng. Giám sát vẫn đang hoạt động.</Text>
        </Pressable>
      ) : null}

      {submitStage ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,37,64,0.75)', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
          <ActivityIndicator color={COLORS.white} size="large" />
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
            {submitStage === 'submitting' ? 'Đang nộp bài, vui lòng đợi...' : 'Đang kết thúc ghi hình...'}
          </Text>
          {submitStage === 'saving-video' ? <Text style={{ color: COLORS.nightInk, fontSize: 12, textAlign: 'center' }}>Vui lòng không thoát ứng dụng.</Text> : null}
        </View>
      ) : null}

      {proctored ? (
        <ProctoringCameraView
          ref={camRef}
          attemptId={attempt.attemptId}
          isStarted={!result && submitStage === null}
          onViolation={handleViolation}
          onProctorResult={handleProctorResult}
        />
      ) : null}
    </View>
  );
}
