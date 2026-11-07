import { useMutation, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { coursesApi } from '@/lib/api/courses';
import { announcementApi, messageApi } from '@/lib/api/communication';
import { COLORS } from '@/lib/theme/colors';

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Cơ bản',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
};

/** Port từ `fe/components/course/CourseOverviewTab.tsx` — có nút "Nhắn tin giảng viên" (mở hội thoại
 * `/messages/{id}`, tương đương `MessageInstructorFloatingButton` của web). */
export function OverviewTab({ courseSlug, courseId, enrolled }: { courseSlug: string; courseId: number; enrolled: boolean }) {
  const startChat = useMutation({
    mutationFn: () => messageApi.startAsStudent(courseId),
    onSuccess: (conv) => router.push(`/messages/${conv.id}` as Href),
    onError: (err: unknown) => Alert.alert('Lỗi', err instanceof ApiError ? err.message : 'Không mở được hội thoại.'),
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-detail', courseSlug],
    queryFn: () => coursesApi.getDetail(courseSlug),
  });

  const { data: announcements } = useQuery({
    queryKey: ['course-announcements', courseId],
    queryFn: () => announcementApi.listForCourse(courseId),
    enabled: enrolled,
  });

  if (isLoading || !course) {
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const totalLessons = course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <View>
        <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.ink, marginBottom: 6 }}>{course.title}</Text>
        <Text style={{ color: COLORS.inkFaint, fontSize: 12.5 }}>
          ★ {course.avgRating?.toFixed(1) ?? '—'} ({course.reviewCount}) · {LEVEL_LABEL[course.level] ?? course.level}
        </Text>
      </View>

      <Text style={{ fontSize: 14, lineHeight: 21, color: COLORS.ink }}>{course.description}</Text>

      <View style={{ borderTopWidth: 1, borderTopColor: COLORS.lineSoft, paddingTop: 12, gap: 4 }}>
        <Text style={{ fontSize: 13, color: COLORS.inkFaint }}>
          {course.chapters.length} chương · {totalLessons} bài giảng
        </Text>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: COLORS.lineSoft, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontWeight: '700', color: COLORS.accent }}>{course.instructorName.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: COLORS.lineDot, textTransform: 'uppercase' }}>Giảng viên</Text>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: COLORS.ink }}>{course.instructorName}</Text>
        </View>
      </View>

      {enrolled ? (
        <Pressable
          disabled={startChat.isPending}
          onPress={() => startChat.mutate()}
          style={{ borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, padding: 10, alignItems: 'center', opacity: startChat.isPending ? 0.6 : 1 }}
        >
          <Text style={{ color: COLORS.accent, fontWeight: '700' }}>
            {startChat.isPending ? 'Đang mở...' : 'Nhắn tin giảng viên'}
          </Text>
        </Pressable>
      ) : null}

      {announcements && announcements.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: COLORS.lineSoft, paddingTop: 12, gap: 8 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: COLORS.lineDot, textTransform: 'uppercase' }}>
            Thông báo từ giảng viên
          </Text>
          {announcements.slice(0, 3).map((a) => (
            <View key={a.id} style={{ backgroundColor: COLORS.surface, borderRadius: 8, padding: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>{a.title}</Text>
                <Text style={{ fontSize: 11, color: COLORS.lineDot }}>{new Date(a.createdAt).toLocaleDateString('vi-VN')}</Text>
              </View>
              <Text style={{ fontSize: 12.5, color: COLORS.inkFaint }}>{a.content}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
