import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Layers } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { lessonsApi } from '@/lib/api/lessons';
import type { ChapterNav, LessonNav } from '@/types/lesson';

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

  // Video bản thân có native code riêng (iOS AVPlayer/Android ExoPlayer qua expo-video) nên chỉ
  // tạo player khi đã có `videoUrl` — nguồn YouTube (videoSource khác) không phát được qua đây.
  const isDirectVideo = !!lesson?.videoUrl && !lesson.youtubeId;
  const player = useVideoPlayer(isDirectVideo ? lesson!.videoUrl : null, (p) => {
    if (!lesson) return;
    p.currentTime = lesson.lastPositionSec;
    p.timeUpdateEventInterval = 1;
    p.play();
  });

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
      <Stack.Screen options={{ headerShown: true, title: lesson.lessonTitle }} />

      {isDirectVideo ? (
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
            onPress={() => router.push(`/materials/${lesson.courseId}` as Href)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}
          >
            <Layers size={18} color="#2563EB" strokeWidth={1.75} />
            <Text style={{ color: '#2563EB', fontWeight: '600' }}>Học liệu AI</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ padding: 16, gap: 12 }}>
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
