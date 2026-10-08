import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View, Platform } from 'react-native';
import { Layers } from 'lucide-react-native';
import * as crypto from 'expo-crypto';

import { ApiError } from '@/lib/api/client';
import { lessonsApi } from '@/lib/api/lessons';
import { BackButton } from '@/components/BackButton';
import { OverviewTab } from '@/components/lesson/OverviewTab';
import { StudyPlanTab } from '@/components/lesson/StudyPlanTab';
import { QnaTab } from '@/components/lesson/QnaTab';
import { GradebookTab } from '@/components/lesson/GradebookTab';
import { ResourcesTab } from '@/components/lesson/ResourcesTab';
import { ReviewsTab } from '@/components/lesson/ReviewsTab';
import { TutorChat } from '@/components/lesson/TutorChat';
import type { ChapterNav, LessonNav } from '@/types/lesson';

// (08/10/2026, theo phản hồi) — bỏ tab "Bài tập" riêng: trên web, bài tập GV giao
// (LessonAssignmentsList) và học liệu AI (MaterialManager) nằm CHUNG 1 tab "Học liệu" (không
// có tab bài tập tách riêng nào cả — khảo sát lại đúng `fe/app/(learn)/learn/[lessonId]/
// page.tsx`). Dời AssignmentsTab sang đầu màn `/materials/[courseId]` (xem file đó).
type MainTab = 'overview' | 'study-plan' | 'qna' | 'gradebook' | 'resources' | 'reviews' | 'tutor';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'study-plan', label: 'Lộ trình AI' },
  { key: 'qna', label: 'Hỏi đáp' },
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

  // Video bản thân có native code riêng (iOS AVPlayer/Android ExoPlayer qua expo-video) nên chỉ
  // tạo player khi đã có `videoUrl` — nguồn YouTube (videoSource khác) không phát được qua đây.
  const isDirectVideo = !!lesson?.videoUrl && !lesson.youtubeId;
  const player = useVideoPlayer(isDirectVideo ? lesson!.videoUrl : null, (p) => {
    if (!lesson) return;
    p.currentTime = lesson.lastPositionSec;
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  const sessionIdRef = useRef<string | null>(null);
  const [streamConflict, setStreamConflict] = useState(false);

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
    }
  }, [lessonId]);

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

    void sendPing(true);

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
        {lesson.enrolled ? (
          <Pressable
            onPress={() => router.push(`/materials/${lesson.courseId}?lessonId=${lesson.lessonId}` as Href)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}
          >
            <Layers size={18} color="#2563EB" strokeWidth={1.75} />
            {/* (08/10/2026, theo phản hồi) — đổi tên khớp đúng web: web gọi tab này "Học liệu",
                không có khái niệm "Học liệu AI" nào. */}
            <Text style={{ color: '#2563EB', fontWeight: '600' }}>Học liệu</Text>
          </Pressable>
        ) : null}
      </View>

      {/* (08/10/2026) — port cấu trúc tab dưới video từ web (gộp luôn tab "AI Gia sư" vốn nằm ở
          sidebar riêng bên web vào chung 1 hàng tab, hợp lý hơn cho màn hình hẹp của mobile thay
          vì chia 2 tầng tab như bản web). KHÔNG port dubbing/transcript/giới hạn phiên xem đồng
          thời — ngoài phạm vi 4 việc đã chốt, xem UpComming_Plan.md. */}
      <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          {MAIN_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setMainTab(tab.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: mainTab === tab.key ? '#2563EB' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: mainTab === tab.key ? '#2563EB' : '#64748B' }}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {mainTab === 'overview' && <OverviewTab courseSlug={lesson.courseSlug} courseId={lesson.courseId} enrolled={lesson.enrolled} />}
        {mainTab === 'study-plan' && <StudyPlanTab courseId={lesson.courseId} enrolled={lesson.enrolled} courseSlug={lesson.courseSlug} />}
        {mainTab === 'qna' && <QnaTab lessonId={lesson.lessonId} enrolled={lesson.enrolled} courseSlug={lesson.courseSlug} />}
        {mainTab === 'tutor' && <TutorChat courseId={lesson.courseId} lessonId={lesson.lessonId} enrolled={lesson.enrolled} courseSlug={lesson.courseSlug} />}
        {mainTab === 'gradebook' && <GradebookTab courseId={lesson.courseId} />}
        {mainTab === 'resources' && <ResourcesTab courseId={lesson.courseId} />}
        {mainTab === 'reviews' && <ReviewsTab courseId={lesson.courseId} />}
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
