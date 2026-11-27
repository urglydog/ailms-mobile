import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as SecureStore from 'expo-secure-store';
import { PlayerSurface } from '@/components/player/PlayerSurface';
import { YouTubeView } from '@/components/player/YouTubeView';
import { useYouTubeController } from '@/components/player/youtubeController';
import { isValidYoutubeId } from '@/components/player/youtubeHtml';
import type { PlayerLike } from '@/types/player';
import { SubtitleSettingsModal } from '@/components/player/SubtitleSettingsModal';
import { DEFAULT_SUBTITLE_SETTINGS, loadSubtitleSettings, saveSubtitleSettings, type SubtitleSettings } from '@/lib/subtitleSettings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Pressable, ScrollView, StatusBar, Switch, Text, View, Platform, useWindowDimensions } from 'react-native';
import { DubAudioSync } from '@/components/player/DubAudioSync';
import { usePlayerTime } from '@/hooks/usePlayerTime';

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
import { COLORS } from '@/lib/theme/colors';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Lock, PlayCircle } from 'lucide-react-native';
import { MOTION } from '@/lib/theme/tokens';

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
type MainTab = 'lectures' | 'overview' | 'study-plan' | 'qna' | 'materials' | 'gradebook' | 'resources' | 'reviews' | 'tutor' | 'transcript';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  // UI v3 (giống Udemy): tab đầu tiên là danh sách bài giảng — chuyển bài không phải kéo qua mô tả.
  { key: 'lectures', label: 'Bài giảng' },
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

// Khung video 16:9 theo bề rộng màn hình (không dùng chiều cao cố định) và ghim ở trên cùng.
const AUTO_NEXT_KEY = 'lms_auto_next_lesson';

function applyRate(player: { playbackRate: number }, rate: number) {
  try {
    player.playbackRate = rate;
  } catch {
    // Player đã giải phóng.
  }
}

function applyMuted(player: { muted: boolean; volume?: number }, muted: boolean) {
  try {
    player.muted = muted;
    if (player.volume !== undefined) player.volume = muted ? 0 : 1;
  } catch {
    // Player đã giải phóng.
  }
}

function seekAndPlay(player: { currentTime: number; play: () => void }, sec: number) {
  try {
    player.currentTime = sec;
    player.play();
  } catch {
    // Player đã giải phóng.
  }
}

const VIDEO_FRAME = { width: '100%', aspectRatio: 16 / 9, backgroundColor: COLORS.black } as const;

export default function LessonPlayerScreen() {
  const { id, seek } = useLocalSearchParams<{ id: string; seek?: string }>();
  const lessonId = Number(id);
  // `?seek=<giây>` do "Ôn tập lại lý thuyết" (AI Gia sư giải thích câu sai) gắn vào — tua tới đúng mốc.
  const seekSec = seek !== undefined && Number.isFinite(Number(seek)) ? Number(seek) : null;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { data: lesson, isLoading, error, refetch } = useQuery({
    queryKey: ['lesson-player', lessonId],
    queryFn: () => lessonsApi.getPlayer(lessonId),
    enabled: Number.isFinite(lessonId),
  });

  const [mainTab, setMainTab] = useState<MainTab>('lectures');

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
  const [subSettings, setSubSettings] = useState<SubtitleSettings>(DEFAULT_SUBTITLE_SETTINGS);
  const [showSubModal, setShowSubModal] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Toàn màn hình = chính khung video này phủ kín màn hình (KHÔNG gắn lại VideoView → không bị tua lại từ đầu như
  // dùng Modal). App khoá dọc nên khi máy đang dọc, xoay khung 90° để lấp đầy như xem ngang.
  const { width: winW, height: winH } = useWindowDimensions();
  const rotateFs = winH > winW;
  const fsW = rotateFs ? winH : winW;
  const fsH = rotateFs ? winW : winH;
  const fullscreenStyle = {
    position: 'absolute' as const,
    zIndex: 100,
    elevation: 100,
    width: fsW,
    height: fsH,
    left: (winW - fsW) / 2,
    top: (winH - fsH) / 2,
    backgroundColor: COLORS.black,
    transform: rotateFs ? [{ rotate: '90deg' }] : [],
  };
  const [dubMuted, setDubMuted] = useState(false);
  const [lastDubLang, setLastDubLang] = useState<string | null>(null);
  const updateSubSettings = (next: SubtitleSettings) => {
    setSubSettings(next);
    saveSubtitleSettings(next);
  };
  const [rate, setRate] = useState(1);
  // Đổi ngôn ngữ lồng tiếng khi đang xem thì video phải tiếp tục phát (như web) — nếu nền tảng làm video dừng
  // do đổi nguồn âm thanh thì tự phát lại trong ~1,5s đầu.
  const toggleFullscreen = (next: boolean) => setFullscreen(next);

  // Xoay ngang điện thoại → vào toàn màn hình; xoay dọc lại → thu nhỏ. Màn bài học mở khoá xoay; rời màn thì khoá dọc lại như các màn khác.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      ScreenOrientation.unlockAsync().catch(() => {});
      const sub = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
        const o = orientationInfo.orientation;
        if (o === ScreenOrientation.Orientation.LANDSCAPE_LEFT || o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT) setFullscreen(true);
        else if (o === ScreenOrientation.Orientation.PORTRAIT_UP) setFullscreen(false);
      });
      return () => {
        sub.remove();
        setFullscreen(false);
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      };
    }, []),
  );

  // Android: nút Back khi đang toàn màn hình thì chỉ thu nhỏ video, không rời bài học.
  useEffect(() => {
    if (!fullscreen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setFullscreen(false);
      return true;
    });
    return () => sub.remove();
  }, [fullscreen]);

  const changeLang = (code: string | null) => {
    let wasPlaying = false;
    try {
      wasPlaying = player.playing;
    } catch {
      // bỏ qua
    }
    setActiveLang(code);
    if (!wasPlaying) return;
    for (const delay of [150, 500, 1000, 1800]) {
      setTimeout(() => {
        try {
          if (!player.playing) player.play();
        } catch {
          // Player đã giải phóng.
        }
      }, delay);
    }
  };
  const [autoNext, setAutoNext] = useState(true);
  useEffect(() => {
    SecureStore.getItemAsync(AUTO_NEXT_KEY)
      .then((v) => setAutoNext(v !== 'false'))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadSubtitleSettings().then(setSubSettings);
  }, []);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const { data: voiceOptions } = useVoiceOptions();
  const [mode, setMode] = useState<'watching' | 'activate' | 'processing'>('watching');
  const [steps, setSteps] = useState<PipelineStep[]>([PREPARE_STEP]);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const activateDubbing = useActivateDubbing();
  const cancelDubbing = useCancelDubbing();

  const { lastEvent } = useDubbingSocket(mode === 'processing' ? lessonId : null);

  /* Hai effect dưới đồng bộ trạng thái giao diện theo sự kiện từ socket lồng tiếng và theo ngôn ngữ đang chọn — đặt state trong effect là chủ ý. */
  /* eslint-disable react-hooks/set-state-in-effect */
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

    // `lang.available` (BE `isPlayable`) là nguồn xác thực như web — trước đây so `track.status ===
    // 'AVAILABLE'` (giá trị BE không bao giờ trả: thật là PROCESSING/PARTIAL/COMPLETED/FAILED) nên
    // ngôn ngữ ĐÃ có lồng tiếng vẫn hiện panel "Kích hoạt lồng tiếng AI".
    if (lang.available) {
      setMode('watching');
    } else if (lang.track?.status === 'PROCESSING' || lang.track?.status === 'CREATED') {
      setMode('processing');
    } else {
      setMode('activate');
    }
  }, [activeLang, lesson]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      return track.chunks[0].fileUrl;
    }
    return null;
  };
  const audioSrc = resolveAudio();
  // Video tải lên phát bằng expo-video (iOS AVPlayer/Android ExoPlayer) — chỉ tạo nguồn khi có `videoUrl`
  // và không phải YouTube. Bài YouTube phát trong WebView (IFrame API) qua `YouTubeController`; cả hai nguồn
  // đều đưa ra cùng giao diện `PlayerLike` (biến `player` bên dưới) nên thanh điều khiển, phụ đề, transcript,
  // giọng lồng tiếng và ghi tiến độ dùng chung.
  const isDirectVideo = !!lesson?.videoUrl && !lesson.youtubeId;
  const youtubeId = lesson?.youtubeId && isValidYoutubeId(lesson.youtubeId) ? lesson.youtubeId : null;
  // Mã lỗi của YouTube khi không nhúng được (101/150/153: chủ video chặn nhúng hoặc thiếu nguồn nhúng; -1: không nạp được trình phát).
  const [ytErrorCode, setYtErrorCode] = useState<number | null>(null);
  const ytFailed = ytErrorCode !== null;
  // Vị trí đang xem dở khi khung YouTube bị gỡ (vd bị giới hạn phiên xem) để tạo lại đúng chỗ.
  const [ytResumeSec, setYtResumeSec] = useState<number | null>(null);
  const ytPlayable = !!youtubeId && !ytFailed && Platform.OS !== 'web';
  const hasPlayer = isDirectVideo || ytPlayable;
  const videoPlayer = useVideoPlayer(isDirectVideo ? lesson!.videoUrl : null, (p) => {
    if (!lesson) return;
    p.currentTime = seekSec ?? lesson.lastPositionSec;
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });

  const lastReportedAtRef = useRef(0);
  const reportProgress = (currentTime: number) => {
    if (!lesson) return;
    if (currentTime - lastReportedAtRef.current >= PROGRESS_REPORT_INTERVAL_SEC) {
      lastReportedAtRef.current = currentTime;
      lessonsApi.recordProgress(lessonId, Math.round(currentTime), Math.round(currentTime)).catch(() => {
        // Best-effort — mất 1 lần report không đáng chặn việc xem tiếp, lần sau tự gửi lại.
      });
    }
  };
  // Tự chuyển bài tiếp theo khi hết video (giống `handleVideoEnded` của web, bật/tắt được).
  const flatLessons = lesson?.chapters.flatMap((c) => c.lessons) ?? [];
  const lessonIdx = flatLessons.findIndex((l) => l.lessonId === lessonId);
  const canOpen = (l?: { isPreview: boolean }) => !!l && (lesson?.enrolled === true || l.isPreview);
  const prevLessonId = lessonIdx > 0 && canOpen(flatLessons[lessonIdx - 1]) ? (flatLessons[lessonIdx - 1]?.lessonId ?? null) : null;
  const nextLessonId = lessonIdx >= 0 && lessonIdx < flatLessons.length - 1 && canOpen(flatLessons[lessonIdx + 1]) ? (flatLessons[lessonIdx + 1]?.lessonId ?? null) : null;
  const goNextLesson = () => {
    if (autoNext && nextLessonId) router.replace(`/lessons/${nextLessonId}` as Href);
  };

  const yt = useYouTubeController({
    onTime: reportProgress,
    onEnded: goNextLesson,
    // YouTube không cho nhúng video này (hoặc không nạp được trình phát) → hiện nút mở trên YouTube.
    onError: (code) => setYtErrorCode(code),
  });
  useEffect(() => {
    if (lesson) yt.setFallbackDuration(lesson.durationSec);
  }, [lesson, yt]);
  const player: PlayerLike = ytPlayable ? yt : videoPlayer;

  // Player có thể chưa sẵn sàng ngay lúc đặt `currentTime` ở callback khởi tạo (đặt khi chưa load xong
  // metadata bị bỏ qua, không báo lỗi) — thử lại vài lần trong ~2 giây, rồi bỏ param để quay lại bài
  // sau không tua lại lần nữa (cùng cách web `?seek=`).
  useEffect(() => {
    if (seekSec === null || !lesson || !hasPlayer) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      player.currentTime = seekSec;
      if (attempts >= 5) {
        clearInterval(timer);
        router.setParams({ seek: undefined });
      }
    }, 400);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekSec, lesson?.lessonId, hasPlayer]);

  // Giọng lồng tiếng chạy ở `DubAudioSync` (mount phía client, tự đồng bộ vị trí với video).

  // expo-router giữ màn hình sống trong stack khi chuyển tab (không unmount) — video tự phát
  // (xem `p.play()` ở trên) sẽ tiếp tục chạy NỀN nếu không chủ động pause lúc rời màn hình.
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Player có thể đã bị giải phóng (native shared object) trước khi cleanup chạy — pause lúc
        // đó ném NotFoundException (bug thật 16/10/2026), nên bọc try/catch.
        try {
          player.pause();
        } catch {
          // Không có gì để pause — bỏ qua.
        }
      };
    }, [player]),
  );

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
          setYtResumeSec(Math.floor(player.currentTime));
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

  // Tốc độ phát (giọng lồng tiếng tự bám theo ở `DubAudioSync`); áp lại khi đổi bài (player mới).
  useEffect(() => {
    applyRate(player, rate);
  }, [player, rate]);

  // Chỉ video tải lên (expo-video) phát các sự kiện này; bài YouTube báo qua `useYouTubeController` ở trên.
  useEventListener(videoPlayer, 'playToEnd', goNextLesson);
  useEventListener(videoPlayer, 'timeUpdate', ({ currentTime }) => reportProgress(currentTime));

  // Gửi nốt vị trí cuối lúc rời màn hình (chuyển bài/back) — nếu không thì tối đa mất
  // PROGRESS_REPORT_INTERVAL_SEC giây tiến độ chưa lưu.
  useEffect(() => {
    return () => {
      if (!lesson || !hasPlayer) return;
      // `expo-video` có thể đã giải phóng native player trước khi cleanup này chạy (race giữa
      // thứ tự cleanup của các effect lúc unmount) — đọc `player.currentTime` lúc đó ném
      // `NotFoundException` (native shared object không còn), crash cả app nếu không try/catch.
      let finalTime: number;
      try {
        finalTime = Math.round(player.currentTime);
      } catch {
        return;
      }
      if (finalTime > lastReportedAtRef.current) {
        lessonsApi.recordProgress(lessonId, finalTime, finalTime).finally(() => {
          queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, hasPlayer]);

  useEffect(() => {
    applyMuted(player, audioSrc !== null);
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
        <Text style={{ color: COLORS.ink }}>{error instanceof ApiError ? error.message : 'Không tải được bài học.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: COLORS.accentDark }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }



  const videoLayer =
    ytPlayable && youtubeId ? (
      <YouTubeView key={youtubeId} controller={yt} youtubeId={youtubeId} startSec={ytResumeSec ?? seekSec ?? lesson.lastPositionSec} />
    ) : (
      // Khung cắt phần thừa: `VideoView` được kéo dài lên/xuống 80px (video vẫn nằm giữa, không đổi cỡ) để nút toàn màn hình gốc của iOS
      // (vẫn hiện dù đã tắt điều khiển gốc, đè lên nút của app) rơi ra ngoài vùng nhìn thấy.
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <VideoView
          player={videoPlayer}
          style={{ position: 'absolute', left: 0, right: 0, top: -80, bottom: -80 }}
          contentFit="contain"
          fullscreenOptions={{ enable: false }}
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      </View>
    );

  const renderSurface = (isFullscreen: boolean) => (
    <PlayerSurface
      player={player}
      video={videoLayer}
      originalSubtitles={lesson.originalSubtitles ?? []}
      translatedSubtitles={currentLang?.subtitles ?? []}
      settings={subSettings}
      onSettingsChange={updateSubSettings}
      dubActive={audioSrc !== null}
      dubMuted={dubMuted}
      onToggleDubMute={() => setDubMuted((m) => !m)}
      rate={rate}
      onRateChange={setRate}
      onOpenSettings={() => setShowSubModal(true)}
      onToggleTranscript={() => {
        toggleFullscreen(false);
        setMainTab('transcript');
      }}
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => toggleFullscreen(!isFullscreen)}
    />
  );

  const voicesForActiveLang = voiceOptions?.filter((vo) => vo.language === activeLang) ?? [];

  return (
    <View style={{ flex: 1 }}>
      {/* Tắt cử chỉ vuốt từ mép trái để quay lại: kéo thanh tua video ở gần mép không còn bị hiểu là quay lại màn trước. */}
      <Stack.Screen options={{ headerShown: !fullscreen, title: lesson.lessonTitle, headerLeft: () => <BackButton />, gestureEnabled: false }} />

      {streamConflict ? (
        <View style={{ ...VIDEO_FRAME, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text style={{ color: COLORS.dangerOnNight, fontWeight: '700', fontSize: 16 }}>Phiên xem bị giới hạn</Text>
          <Text style={{ color: COLORS.line, textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
            Tài khoản của bạn đang mở bài giảng này ở một thiết bị khác. Vui lòng dừng ở thiết bị kia, hoặc bấm giành lại quyền phát tại đây.
          </Text>
          <Pressable onPress={handleResumeStream} style={{ backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginTop: 8 }}>
            <Text style={{ color: COLORS.white, fontWeight: '600' }}>Giành quyền phát</Text>
          </Pressable>
        </View>
      ) : hasPlayer ? (
        <View style={fullscreen ? fullscreenStyle : VIDEO_FRAME}>{renderSurface(fullscreen)}</View>
      ) : lesson.youtubeId ? (
        <Pressable
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${lesson.youtubeId}`)}
          style={{ ...VIDEO_FRAME, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}
        >
          <Text style={{ color: COLORS.white, fontWeight: '700', textAlign: 'center' }}>
            {ytFailed ? 'Video này chưa phát được trong ứng dụng.' : 'Video YouTube'}
          </Text>
          <Text style={{ color: COLORS.white, opacity: 0.8, textAlign: 'center', fontSize: 13 }}>Chạm để mở video trên YouTube.</Text>
          {ytErrorCode !== null ? <Text style={{ color: COLORS.white, opacity: 0.5, textAlign: 'center', fontSize: 11 }}>Mã lỗi YouTube: {ytErrorCode}</Text> : null}
        </Pressable>
      ) : (
        <View style={{ ...VIDEO_FRAME, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.white }}>Chưa có video cho bài này.</Text>
        </View>
      )}

      <StatusBar hidden={fullscreen} />
      <SubtitleSettingsModal
        visible={showSubModal}
        settings={subSettings}
        hasTranslated={(currentLang?.subtitles?.length ?? 0) > 0}
        onChange={updateSubSettings}
        rate={rate}
        onRateChange={setRate}
        autoNext={autoNext}
        onAutoNextChange={(v) => {
          setAutoNext(v);
          SecureStore.setItemAsync(AUTO_NEXT_KEY, String(v)).catch(() => {});
        }}
        onClose={() => setShowSubModal(false)}
      />

      {typeof window !== 'undefined' && audioSrc ? <DubAudioSync key={currentLang?.code} track={track!} video={player} muted={dubMuted} /> : null}

      <ScrollView style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 2 }}>
        <Text style={{ color: COLORS.inkFaint, fontSize: 12.5, fontWeight: '600' }} numberOfLines={1}>
          Bài {lessonIdx + 1}/{flatLessons.length} · {lesson.courseTitle}
        </Text>
        <Text style={{ color: COLORS.ink, fontSize: 17, fontWeight: '800' }}>{lesson.lessonTitle}</Text>
        {!lesson.enrolled && lesson.isPreview ? (
          <Text style={{ color: COLORS.warning }}>Bạn đang xem thử — ghi danh để xem toàn bộ khoá học.</Text>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 12 }}>
        <LanguageDropdown
          languages={lesson.languages || []}
          activeCode={activeLang}
          sourceLanguage={lesson.sourceLanguage}
          onSelect={(code) => {
            changeLang(code);
            setLastDubLang(code);
            const langs = voiceOptions?.filter((v) => v.language === code) ?? [];
            const def = langs.find((v) => v.isDefault) ?? langs[0];
            setSelectedVoiceName(def?.voiceName ?? null);
          }}
        />

        {/* Công tắc "Nghe bản gốc" như web (`DubbingBar`): bật = nghe âm thanh gốc (bỏ giọng lồng tiếng);
            tắt = quay lại giọng lồng tiếng vừa dùng, hoặc giọng đã sẵn sàng đầu tiên. */}
        {hasPlayer ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.lineSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.surfaceRaised }}>
            <Text style={{ color: COLORS.ink, fontWeight: '600' }}>Nghe bản gốc</Text>
            <Switch
              value={activeLang === null}
              trackColor={{ true: COLORS.accent, false: COLORS.line }}
              onValueChange={(listenOriginal) => {
                if (listenOriginal) {
                  changeLang(null);
                  return;
                }
                const ready = (lesson.languages ?? []).filter((l) => l.available);
                const target = ready.find((l) => l.code === lastDubLang) ?? ready[0];
                if (!target) {
                  Alert.alert('Chưa có giọng lồng tiếng', 'Chọn một ngôn ngữ ở trên và kích hoạt lồng tiếng AI để nghe.');
                  return;
                }
                changeLang(target.code);
                setLastDubLang(target.code);
                const langs = voiceOptions?.filter((v) => v.language === target.code) ?? [];
                const def = langs.find((v) => v.isDefault) ?? langs[0];
                setSelectedVoiceName(def?.voiceName ?? null);
              }}
            />
          </View>
        ) : null}

        {mode === 'activate' && currentLang && (
          <View style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.lineSoft }}>
            <DubbingActivatePanel
              languageLabel={currentLang.label}
              onActivate={handleActivateDubbing}
              onWatchOriginal={() => changeLang(null)}
              quotaExceeded={quotaExceeded}
              isSubmitting={activateDubbing.isPending}
              voices={voicesForActiveLang}
              selectedVoice={selectedVoiceName}
              onSelectVoice={setSelectedVoiceName}
            />
          </View>
        )}

        {mode === 'processing' && (
          <View style={{ backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.lineSoft }}>
            <PipelineProgress
              steps={steps}
              percent={lastEvent && 'stage' in lastEvent && lastEvent.stage !== 'PREPARING' && lastEvent.stage !== 'FINALIZING' && lastEvent.totalChunks ? Math.round(((lastEvent.chunkIndex ?? 0) / lastEvent.totalChunks) * 100) : undefined}
              onWatchOriginal={() => changeLang(null)}
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
      <View style={{ borderTopWidth: 1, borderTopColor: COLORS.lineSoft, marginTop: 8 }}>
        {/* UI v2: tab dạng "pill" — mục đang chọn có nền tint + chữ đậm, đổi màu bằng CSS transition
            của Reanimated (120 ms), vùng chạm cao 40. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}
          style={{ borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft }}
        >
          {[...MAIN_TABS, { key: 'transcript', label: 'Transcript' }].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setMainTab(tab.key as MainTab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mainTab === tab.key }}
            >
              <Animated.View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  minHeight: 40,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: mainTab === tab.key ? COLORS.tint : 'transparent',
                  transitionProperty: 'backgroundColor',
                  transitionDuration: MOTION.fast,
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: mainTab === tab.key ? '700' : '600', color: mainTab === tab.key ? COLORS.accentDark : COLORS.inkMuted }}>
                  {tab.label}
                </Text>
                {tab.key === 'materials' && lessonMaterialCount > 0 ? (
                  <View style={{ marginLeft: 6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.white }}>{lessonMaterialCount}</Text>
                  </View>
                ) : null}
              </Animated.View>
            </Pressable>
          ))}
        </ScrollView>

        {mainTab === 'lectures' && (
          <View style={{ paddingHorizontal: 12, paddingVertical: 12, gap: 10 }}>
            {lesson.chapters.map((chapter, i) => (
              <ChapterNavSection
                key={chapter.chapterId}
                index={i}
                chapter={chapter}
                currentLessonId={lesson.lessonId}
                canOpenAll={lesson.enrolled}
              />
            ))}
          </View>
        )}
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
            <LiveTranscript
              player={player}
              originalSubtitles={lesson.originalSubtitles ?? []}
              translatedSubtitles={currentLang?.subtitles ?? []}
              onSeek={(sec) => seekAndPlay(player, sec)}
            />
          </View>
        )}
      </View>

      </ScrollView>

      {/* UI v3: thanh chuyển bài cố định ở đáy — luôn trong tầm ngón cái. */}
      {!fullscreen ? (
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 + insets.bottom, borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.surfaceRaised }}>
          <NavButton label="Bài trước" icon="prev" targetId={prevLessonId} />
          <NavButton label="Bài tiếp" icon="next" targetId={nextLessonId} primary />
        </View>
      ) : null}
    </View>
  );
}

function NavButton({ label, icon, targetId, primary }: { label: string; icon: 'prev' | 'next'; targetId: number | null; primary?: boolean }) {
  const disabled = targetId === null;
  const Icon = icon === 'prev' ? ChevronLeft : ChevronRight;
  const fg = primary ? COLORS.white : COLORS.ink;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => targetId !== null && router.replace(`/lessons/${targetId}` as Href)}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 46,
        borderRadius: 10,
        flexDirection: icon === 'prev' ? 'row' : 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: primary ? COLORS.accent : COLORS.surface,
        borderWidth: primary ? 0 : 1,
        borderColor: COLORS.line,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Icon size={18} color={fg} />
      <Text style={{ color: fg, fontWeight: '700', fontSize: 14.5 }}>{label}</Text>
    </Pressable>
  );
}

function formatMinutes(sec: number) {
  const m = Math.max(1, Math.round(sec / 60));
  return `${m} phút`;
}

/** Chương thu gọn được; chương chứa bài đang học mở sẵn. */
function ChapterNavSection({ chapter, index, currentLessonId, canOpenAll }: { chapter: ChapterNav; index: number; currentLessonId: number; canOpenAll: boolean }) {
  const containsCurrent = chapter.lessons.some((l) => l.lessonId === currentLessonId);
  const [open, setOpen] = useState(containsCurrent);
  const done = chapter.lessons.filter((l) => l.isCompleted).length;
  const total = chapter.lessons.reduce((sum, l) => sum + l.durationSec, 0);
  return (
    <View style={{ backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, overflow: 'hidden' }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: COLORS.inkFaint, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Chương {index + 1}</Text>
          <Text style={{ color: COLORS.ink, fontWeight: '700', fontSize: 15 }}>{chapter.chapterTitle}</Text>
          <Text style={{ color: COLORS.inkFaint, fontSize: 12 }}>
            {done}/{chapter.lessons.length} bài · {formatMinutes(total)}
          </Text>
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown size={20} color={COLORS.inkMuted} />
        </View>
      </Pressable>
      {open
        ? chapter.lessons.map((l, i) => (
            <LessonNavRow key={l.lessonId} number={i + 1} lesson={l} active={l.lessonId === currentLessonId} locked={!canOpenAll && !l.isPreview} />
          ))
        : null}
    </View>
  );
}

function LessonNavRow({ lesson, number, active, locked }: { lesson: LessonNav; number: number; active: boolean; locked: boolean }) {
  const StatusIcon = lesson.isCompleted ? CheckCircle2 : locked ? Lock : PlayCircle;
  const iconColor = lesson.isCompleted ? COLORS.success : active ? COLORS.accentDark : COLORS.inkFaint;
  return (
    <Pressable
      disabled={active || locked}
      onPress={() => router.replace(`/lessons/${lesson.lessonId}` as Href)}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: locked }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.lineSoft,
        borderLeftWidth: 3,
        borderLeftColor: active ? COLORS.accent : 'transparent',
        backgroundColor: active ? COLORS.tint : pressed ? COLORS.surface : 'transparent',
      })}
    >
      <Text style={{ width: 18, textAlign: 'center', color: COLORS.inkFaint, fontSize: 13 }}>{number}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: locked ? COLORS.inkFaint : COLORS.ink, fontWeight: active ? '700' : '500', fontSize: 14 }} numberOfLines={2}>
          {lesson.lessonTitle}
        </Text>
        <Text style={{ color: COLORS.inkFaint, fontSize: 12 }}>
          {active ? 'Đang học · ' : ''}
          {formatMinutes(lesson.durationSec)}
        </Text>
      </View>
      <StatusIcon size={18} color={iconColor} />
    </Pressable>
  );
}

/** Transcript tô sáng theo thời gian video — đọc giờ ở đây (không ở màn cha) để chỉ re-render phần này. */
function LiveTranscript({ player, ...rest }: { player: { currentTime: number } } & Omit<React.ComponentProps<typeof TranscriptPanel>, 'currentSec'>) {
  const currentSec = usePlayerTime(player, true);
  return <TranscriptPanel {...rest} currentSec={currentSec} />;
}
