import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View, Platform } from 'react-native';
import { useAudioPlayer } from 'expo-audio';

import { ApiError, getOrCreateStreamSessionId } from '@/lib/api/client';
import { lessonsApi } from '@/lib/api/lessons';
import { materialsApi } from '@/lib/api/materials';
import { courseResourcesApi } from '@/lib/api/courseResources';
import { BackButton } from '@/components/BackButton';
import { OverviewTab } from '@/components/lesson/OverviewTab';
import { StudyPlanTab } from '@/components/lesson/StudyPlanTab';
import { QnaTab } from '@/components/lesson/QnaTab';
import { GradebookTab } from '@/components/lesson/GradebookTab';
import { ResourcesTab } from '@/components/lesson/ResourcesTab';
import { ReviewsTab } from '@/components/lesson/ReviewsTab';
import { TutorChat } from '@/components/lesson/TutorChat';
import { MaterialsWorkspace, matchesLessonContext } from '@/components/materials/MaterialsWorkspace';
import { LanguageDropdown } from '@/components/player/LanguageDropdown';
import { DubbingActivatePanel } from '@/components/player/DubbingActivatePanel';
import { PipelineProgress } from '@/components/player/PipelineProgress';
import { TranscriptPanel } from '@/components/player/TranscriptPanel';
import { useActivateDubbing, useCancelDubbing } from '@/hooks/useDubbing';
import { useDubbingSocket } from '@/hooks/useDubbingSocket';
import { useVoiceOptions } from '@/hooks/useVoiceOptions';
import type { PipelineStep } from '@/types/dubbing';
import type { ChapterNav, LessonNav } from '@/types/lesson';

const STAGE_LABELS: Record<string, string> = {
  ASR: 'Đang bóc tách lời thoại (STT)',
  TRANSLATE: 'Đang dịch nội dung',
  TTS: 'Đang tổng hợp giọng đọc',
  UPLOADING: 'Đang lưu file đoạn này',
};

const PREPARE_STEP: PipelineStep = {
  key: 'prepare',
  label: 'Đang tải & phân tích audio nguồn',
  done: false,
  active: true,
};

const FINALIZE_STEP: PipelineStep = {
  key: 'finalize',
  label: 'Đang ghép & lưu file hoàn chỉnh',
  done: false,
  active: false,
};

function buildChunkSteps(totalChunks: number): PipelineStep[] {
  return [
    { ...PREPARE_STEP, done: true, active: false },
    ...Array.from({ length: totalChunks }, (_, i) => ({
      key: `chunk-${i}`,
      label: `Đoạn ${i + 1}/${totalChunks} — đang chờ xử lý`,
      done: false,
      active: false,
    })),
    { ...FINALIZE_STEP },
  ];
}

// (12/10/2026, sửa theo phản hồi) — "Học liệu" giờ là tab NGANG HÀNG với Tổng quan/Hỏi đáp/...,
// khớp đúng vị trí trong `fe`'s MAIN_TABS (overview, study-plan, qna, materials, gradebook,
// resources, reviews). Trước đây (08/10/2026) chỉ là 1 nút điều hướng sang màn `/materials/
// [courseId]` riêng — không phải tab thật, cũng không có badge số lượng như web. Nội dung tab
// (bài tập GV giao + học liệu) dùng chung `MaterialsWorkspace` với màn `/materials/[courseId]`.
type MainTab = 'overview' | 'study-plan' | 'qna' | 'materials' | 'gradebook' | 'resources' | 'reviews' | 'tutor' | 'transcript';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'study-plan', label: 'Lộ trình AI' },
  { key: 'qna', label: 'Hỏi đáp' },
  { key: 'materials', label: 'Học liệu' },
  { key: 'tutor', label: 'AI Gia sư' },
  { key: 'gradebook', label: 'Bảng điểm' },
  { key: 'resources', label: 'Tài nguyên' },
  { key: 'reviews', label: 'Đánh giá' },
];

/** Gửi tiến độ lên BE mỗi ~15s khi đang phát — khớp chu kỳ bản Web (xem docblock BE
 * `LessonProgressController`), tránh spam request mỗi lần timeUpdate (0.5-1s/lần). */
const PROGRESS_REPORT_INTERVAL_SEC = 15;

export default function LessonPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = Number(id);
  const queryClient = useQueryClient();

  const { data: lesson, isLoading, error, refetch } = useQuery({
    queryKey: ['lesson-player', lessonId],
    queryFn: () => lessonsApi.getPlayer(lessonId),
    enabled: Number.isFinite(lessonId),
  });

  const [mainTab, setMainTab] = useState<MainTab>('overview');

  // Badge đỏ trên tab "Học liệu" — khớp `fe`'s `currentLessonMaterialCount` (official materials +
  // tài nguyên khoá học gắn với bài/chương hiện tại), dùng chung `matchesLessonContext` với
  // `MaterialsWorkspace` để không lệch số giữa badge và nội dung thật khi mở tab.
  const { data: sharedMaterialsForBadge } = useQuery({
    queryKey: ['materials', lesson?.courseId, 'shared'],
    queryFn: () => materialsApi.listSharedForCourse(lesson!.courseId),
    enabled: !!lesson?.courseId && lesson.enrolled,
  });
  const { data: courseResourcesForBadge } = useQuery({
    queryKey: ['course-resources', lesson?.courseId],
    queryFn: () => courseResourcesApi.listForCourse(lesson!.courseId),
    enabled: !!lesson?.courseId && lesson.enrolled,
  });
  const lessonMaterialCount =
    (sharedMaterialsForBadge?.filter((m) => m.status === 'COMPLETED' && matchesLessonContext(m.assignments, lessonId, lesson?.chapters)).length ?? 0) +
    (courseResourcesForBadge?.filter((r) =>
      matchesLessonContext(
        r.chapterId != null || r.lessonId != null ? [{ id: 0, chapterId: r.chapterId ?? undefined, lessonId: r.lessonId ?? undefined }] : [],
        lessonId,
        lesson?.chapters,
      ),
    ).length ?? 0);

  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const { data: voiceOptions } = useVoiceOptions();
  const [mode, setMode] = useState<'watching' | 'activate' | 'processing'>('watching');
  const [steps, setSteps] = useState<PipelineStep[]>([PREPARE_STEP]);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const activateDubbing = useActivateDubbing();
  const cancelDubbing = useCancelDubbing();

  const { lastEvent } = useDubbingSocket(mode === 'processing' ? lessonId : null);

  useEffect(() => {
    if (!lastEvent) return;

    if ('stage' in lastEvent) {
      const { stage, chunkIndex, totalChunks } = lastEvent;

      if (stage === 'PREPARING') {
        setSteps([PREPARE_STEP]);
        return;
      }

      if (stage === 'FINALIZING') {
        setSteps((prev) =>
          prev.map((step) =>
            step.key === 'finalize' ? { ...step, active: true } : { ...step, done: true, active: false },
          ),
        );
        return;
      }

      setSteps((prev) => {
        const size = totalChunks ?? 0;
        const chunkCount = prev.filter((s) => s.key.startsWith('chunk-')).length;
        const base = chunkCount === size ? prev : buildChunkSteps(size);
        return base.map((step) => {
          if (step.key === `chunk-${chunkIndex}`) {
            return {
              ...step,
              label: `Đoạn ${(chunkIndex ?? 0) + 1}/${size} — ${STAGE_LABELS[stage] ?? stage}`,
              active: true,
            };
          }
          if (step.key === 'prepare') {
            return { ...step, done: true, active: false };
          }
          return step;
        });
      });
      return;
    }

    if ('chunkIndex' in lastEvent) {
      setSteps((prev) => {
        const size = lastEvent.totalChunks;
        const chunkCount = prev.filter((s) => s.key.startsWith('chunk-')).length;
        const base = chunkCount === size ? prev : buildChunkSteps(size);
        return base.map((step) => {
          if (step.key === `chunk-${lastEvent.chunkIndex}`) {
            return {
              ...step,
              label: `Đoạn ${lastEvent.chunkIndex + 1}/${size}`,
              done: lastEvent.status === 'COMPLETED',
              failed: lastEvent.status === 'FAILED',
              active: false,
            };
          }
          return step;
        });
      });
      if (lastEvent.status === 'COMPLETED') {
        void refetch();
      }
      return;
    }

    if (lastEvent.status === 'COMPLETED') {
      void refetch();
      setMode('watching');
      return;
    }

    if (lastEvent.status === 'FAILED') {
      setMode('watching');
      return;
    }
  }, [lastEvent, refetch]);

  // Handle activeLang changing
  useEffect(() => {
    if (!lesson) return;
    if (!activeLang) {
      setMode('watching');
      return;
    }

    const lang = lesson.languages?.find((l) => l.code === activeLang);
    if (!lang) return;

    if (lang.track?.status === 'AVAILABLE') {
      setMode('watching');
    } else if (lang.track?.status === 'PROCESSING' || lang.track?.status === 'CREATED') {
      setMode('processing');
    } else {
      setMode('activate');
    }
  }, [activeLang, lesson]);

  const handleActivateDubbing = () => {
    if (!activeLang) return;
    activateDubbing.mutate(
      { lessonId, targetLanguage: activeLang, voiceName: selectedVoiceName },
      {
        onSuccess: () => {
          void refetch();
          setMode('processing');
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 429) {
            setQuotaExceeded(true);
          }
        },
      },
    );
  };

  const handleCancelDubbing = () => {
    if (!activeLang) return;
    cancelDubbing.mutate(
      { lessonId, targetLanguage: activeLang },
      {
        onSuccess: () => {
          void refetch();
          setMode('watching');
        },
      },
    );
  };

  // Resolve audio source
  const currentLang = lesson?.languages?.find((l) => l.code === activeLang);
  const track = currentLang?.track;
  const resolveAudio = () => {
    if (!track) return null;
    if (track.finalUrl) return track.finalUrl;
    if (track.chunks && track.chunks.length > 0) {
      // Very naive chunk selection for native (since we don't sync offset easily here, we just play the first available chunk for now, or the final. Better implementation would sync with video currentTime)
      return track.chunks[0].url;
    }
    return null;
  };
  const audioSrc = resolveAudio();
  // Video bản thân có native code riêng (iOS AVPlayer/Android ExoPlayer qua expo-video) nên chỉ
  // tạo player khi đã có `videoUrl` — nguồn YouTube (videoSource khác) không phát được qua đây.
  const isDirectVideo = !!lesson?.videoUrl && !lesson.youtubeId;
  const player = useVideoPlayer(isDirectVideo ? lesson!.videoUrl : null, (p) => {
    if (!lesson) return;
    p.currentTime = lesson.lastPositionSec;
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  // expo-av đã bị gỡ khỏi Expo Go từ SDK 55 (lỗi "Cannot find native module 'ExponentAV'") —
  // dùng expo-audio. Hook tự release player khi unmount và tự nạp lại khi `audioSrc` đổi.
  const dubPlayer = useAudioPlayer(audioSrc);

  // Audio lồng tiếng đi theo trạng thái phát/dừng của video (video bị mute khi có audioSrc).
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (!audioSrc) return;
    if (isPlaying) dubPlayer.play();
    else dubPlayer.pause();
  });

  useEffect(() => {
    if (audioSrc && player.playing) dubPlayer.play();
  }, [audioSrc, dubPlayer, player]);


  const sessionIdRef = useRef<string | null>(null);
  const [streamConflict, setStreamConflict] = useState(false);

  useEffect(() => {
    // BUG THẬT (12/10/2026, user báo cáo) — trước đây tạo sessionId MỚI mỗi lần mount màn này
    // (`crypto.randomUUID()` ngay tại đây), rồi gửi heartbeat đầu tiên với `force=true`. Hệ quả:
    // chỉ cần MỞ màn bài học (chưa hề bấm play) là đã cưỡng chế giành khoá "đang phát" từ bất kỳ
    // thiết bị nào khác đang thật sự xem — khiến web bị tạm dừng + hiện "Đã phát hiện thiết bị
    // khác" dù mobile chưa phát gì cả (xem `PlayerHeartbeatService.processHeartbeat`, BE:
    // `force=true` LUÔN ghi đè session, không throw). Giờ dùng `getOrCreateStreamSessionId()` —
    // ID bền theo THIẾT BỊ (lưu SecureStore/localStorage), không đổi mỗi lần vào bài học — và đổi
    // heartbeat đầu tiên sang `force=false` (xem effect dưới) để BE tự phát hiện xung đột thật
    // thay vì mobile luôn thắng vô điều kiện.
    getOrCreateStreamSessionId().then((id) => {
      sessionIdRef.current = id;
    });
  }, []);

  useEffect(() => {
    if (!lessonId || streamConflict) return;

    const sendPing = async (force: boolean) => {
      if (!sessionIdRef.current) return;
      try {
        await lessonsApi.sendHeartbeat(lessonId, sessionIdRef.current, `${Platform.OS} App`, force);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setStreamConflict(true);
          player.pause();
        }
      }
    };

    // `force=false` — chỉ CLAIM khoá nếu chưa ai giữ, hoặc chính thiết bị này (cùng sessionId bền
    // ở trên) đang giữ; nếu thiết bị KHÁC thật sự đang giữ thì BE trả 409, hiện đúng modal xung
    // đột cho người VỪA MỞ màn này thay vì âm thầm cướp quyền của người đang xem thật.
    void sendPing(false);

    const intervalId = setInterval(() => {
      void sendPing(false);
    }, 20000);

    return () => clearInterval(intervalId);
  }, [lessonId, streamConflict, player]);

  const handleResumeStream = async () => {
    if (!sessionIdRef.current) return;
    try {
      await lessonsApi.sendHeartbeat(lessonId, sessionIdRef.current, `${Platform.OS} App`, true);
      setStreamConflict(false);
      player.play();
    } catch {
      // Best effort
    }
  };

  const lastReportedAtRef = useRef(0);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (!lesson) return;
    if (currentTime - lastReportedAtRef.current >= PROGRESS_REPORT_INTERVAL_SEC) {
      lastReportedAtRef.current = currentTime;
      lessonsApi.recordProgress(lessonId, Math.round(currentTime), Math.round(currentTime)).catch(() => {
        // Best-effort — mất 1 lần report không đáng chặn việc xem tiếp, lần sau tự gửi lại.
      });
    }
  });

  // Gửi nốt vị trí cuối lúc rời màn hình (chuyển bài/back) — nếu không thì tối đa mất
  // PROGRESS_REPORT_INTERVAL_SEC giây tiến độ chưa lưu.
  useEffect(() => {
    return () => {
      if (!lesson || !isDirectVideo) return;
      const finalTime = Math.round(player.currentTime);
      if (finalTime > lastReportedAtRef.current) {
        lessonsApi.recordProgress(lessonId, finalTime, finalTime).finally(() => {
          queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, isDirectVideo]);

  useEffect(() => {
    player.muted = audioSrc !== null;
  }, [audioSrc, player]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text>{error instanceof ApiError ? error.message : 'Không tải được bài học.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: '#2563EB' }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }



  const activeLangOption = voiceOptions?.find((vo) => vo.language === activeLang);
  const voicesForActiveLang = voiceOptions?.filter((vo) => vo.language === activeLang) ?? [];

  return (
    <ScrollView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: lesson.lessonTitle, headerLeft: () => <BackButton /> }} />

      {streamConflict ? (
        <View style={{ width: '100%', height: 220, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text style={{ color: '#F87171', fontWeight: '700', fontSize: 16 }}>Phiên xem bị giới hạn</Text>
          <Text style={{ color: '#CBD5E1', textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
            Tài khoản của bạn đang mở bài giảng này ở một thiết bị khác. Vui lòng dừng ở thiết bị kia, hoặc bấm giành lại quyền phát tại đây.
          </Text>
          <Pressable onPress={handleResumeStream} style={{ backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginTop: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Giành quyền phát</Text>
          </Pressable>
        </View>
      ) : isDirectVideo ? (
        <VideoView player={player} style={{ width: '100%', height: 220, backgroundColor: '#000' }} nativeControls />
      ) : lesson.youtubeId ? (
        <Pressable
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${lesson.youtubeId}`)}
          style={{ width: '100%', height: 220, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff' }}>Video YouTube — chạm để mở</Text>
        </Pressable>
      ) : (
        <View style={{ width: '100%', height: 220, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff' }}>Chưa có video cho bài này.</Text>
        </View>
      )}

      <View style={{ padding: 16, gap: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{lesson.lessonTitle}</Text>
        <Text style={{ color: '#475569' }}>{lesson.courseTitle}</Text>
        {!lesson.enrolled && lesson.isPreview ? (
          <Text style={{ color: '#D97706' }}>Bạn đang xem thử — ghi danh để xem toàn bộ khoá học.</Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 16 }}>
        <LanguageDropdown
          languages={lesson.languages || []}
          activeCode={activeLang}
          sourceLanguage={lesson.sourceLanguage}
          onSelect={(code) => {
            setActiveLang(code);
            const langs = voiceOptions?.filter((v) => v.language === code) ?? [];
            const def = langs.find((v) => v.isDefault) ?? langs[0];
            setSelectedVoiceName(def?.voiceName ?? null);
          }}
        />

        {mode === 'activate' && currentLang && (
          <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <DubbingActivatePanel
              languageLabel={currentLang.label}
              onActivate={handleActivateDubbing}
              onWatchOriginal={() => setActiveLang(null)}
              quotaExceeded={quotaExceeded}
              isSubmitting={activateDubbing.isPending}
              voices={voicesForActiveLang}
              selectedVoice={selectedVoiceName}
              onSelectVoice={setSelectedVoiceName}
            />
          </View>
        )}

        {mode === 'processing' && (
          <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <PipelineProgress
              steps={steps}
              percent={lastEvent && 'stage' in lastEvent && lastEvent.stage !== 'PREPARING' && lastEvent.stage !== 'FINALIZING' && lastEvent.totalChunks ? Math.round(((lastEvent.chunkIndex ?? 0) / lastEvent.totalChunks) * 100) : undefined}
              onWatchOriginal={() => setActiveLang(null)}
              onCancel={handleCancelDubbing}
              isCancelling={cancelDubbing.isPending}
            />
          </View>
        )}
      </View>

      {/* (08/10/2026) — port cấu trúc tab dưới video từ web (gộp luôn tab "AI Gia sư" vốn nằm ở
          sidebar riêng bên web vào chung 1 hàng tab, hợp lý hơn cho màn hình hẹp của mobile thay
          vì chia 2 tầng tab như bản web). KHÔNG port dubbing/transcript/giới hạn phiên xem đồng
          thời — ngoài phạm vi 4 việc đã chốt, xem UpComming_Plan.md. */}
      <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          {[...MAIN_TABS, { key: 'transcript', label: 'Transcript' }].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setMainTab(tab.key as MainTab)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: mainTab === tab.key ? '#2563EB' : 'transparent',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: mainTab === tab.key ? '#2563EB' : '#64748B' }}>
                  {tab.label}
                </Text>
                {tab.key === 'materials' && lessonMaterialCount > 0 ? (
                  <View style={{ marginLeft: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{lessonMaterialCount}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {mainTab === 'overview' && <OverviewTab courseSlug={lesson.courseSlug} courseId={lesson.courseId} enrolled={lesson.enrolled} />}
        {mainTab === 'study-plan' && (
          <StudyPlanTab
            courseId={lesson.courseId}
            enrolled={lesson.enrolled}
            courseSlug={lesson.courseSlug}
            completedLessonIds={lesson.chapters.flatMap((c) => c.lessons).filter((l) => l.isCompleted).map((l) => l.lessonId)}
            allLessons={lesson.chapters.flatMap((c) => c.lessons).map((l) => ({ lessonId: l.lessonId, durationSec: l.durationSec }))}
          />
        )}
        {mainTab === 'qna' && <QnaTab lessonId={lesson.lessonId} enrolled={lesson.enrolled} courseSlug={lesson.courseSlug} />}
        {mainTab === 'materials' && (
          <View style={{ padding: 16 }}>
            <MaterialsWorkspace
              courseId={lesson.courseId}
              lessonId={lesson.lessonId}
              chapters={lesson.chapters}
              enrolled={lesson.enrolled}
              courseSlug={lesson.courseSlug}
            />
          </View>
        )}
        {mainTab === 'tutor' && <TutorChat courseId={lesson.courseId} lessonId={lesson.lessonId} enrolled={lesson.enrolled} courseSlug={lesson.courseSlug} />}
        {mainTab === 'gradebook' && <GradebookTab courseId={lesson.courseId} />}
        {mainTab === 'resources' && <ResourcesTab courseId={lesson.courseId} />}
        {mainTab === 'reviews' && <ReviewsTab courseId={lesson.courseId} />}
        {mainTab === 'transcript' && (
          <View style={{ padding: 16 }}>
            <TranscriptPanel
              originalSubtitles={lesson.originalSubtitles ?? []}
              translatedSubtitles={currentLang?.subtitles ?? []}
              currentSec={player.currentTime}
              onSeek={(sec) => {
                player.currentTime = sec;
                player.play();
              }}
            />
          </View>
        )}
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 14, color: '#0F172A' }}>Nội dung khóa học</Text>
        {lesson.chapters.map((chapter) => (
          <ChapterNavSection key={chapter.chapterId} chapter={chapter} currentLessonId={lesson.lessonId} />
        ))}
      </View>
    </ScrollView>
  );
}

function ChapterNavSection({ chapter, currentLessonId }: { chapter: ChapterNav; currentLessonId: number }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontWeight: '600' }}>{chapter.chapterTitle}</Text>
      {chapter.lessons.map((lesson) => (
        <LessonNavRow key={lesson.lessonId} lesson={lesson} active={lesson.lessonId === currentLessonId} />
      ))}
    </View>
  );
}

function LessonNavRow({ lesson, active }: { lesson: LessonNav; active: boolean }) {
  return (
    <Pressable
      onPress={() => !active && router.replace(`/lessons/${lesson.lessonId}` as Href)}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingLeft: 12,
        backgroundColor: active ? '#EFF6FF' : 'transparent',
        borderRadius: 6,
      }}
    >
      <Text style={{ color: active ? '#2563EB' : '#334155', fontWeight: active ? '700' : '400' }}>
        {lesson.isCompleted ? '✓ ' : ''}
        {lesson.lessonTitle}
      </Text>
      <Text style={{ color: '#94A3B8' }}>{Math.round(lesson.durationSec / 60)} phút</Text>
    </Pressable>
  );
}
