import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Text, View } from 'react-native';

import { coursesApi } from '@/lib/api/courses';
import { announcementApi } from '@/lib/api/communication';

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Cơ bản',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
};

/** Port từ `fe/components/course/CourseOverviewTab.tsx` — bỏ nút "Nhắn tin giảng viên" (mobile
 * chưa có màn hộp thư `/messages`, ngoài phạm vi 4 việc đã chốt lần này). */
export function OverviewTab({ courseSlug, courseId, enrolled }: { courseSlug: string; courseId: number; enrolled: boolean }) {
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
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>{course.title}</Text>
        <Text style={{ color: '#64748B', fontSize: 12.5 }}>
          ★ {course.avgRating?.toFixed(1) ?? '—'} ({course.reviewCount}) · {LEVEL_LABEL[course.level] ?? course.level}
        </Text>
      </View>

      <Text style={{ fontSize: 14, lineHeight: 21, color: '#0F172A' }}>{course.description}</Text>

      <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, gap: 4 }}>
        <Text style={{ fontSize: 13, color: '#64748B' }}>
          {course.chapters.length} chương · {totalLessons} bài giảng
        </Text>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontWeight: '700', color: '#2563EB' }}>{course.instructorName.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Giảng viên</Text>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>{course.instructorName}</Text>
        </View>
      </View>

      {announcements && announcements.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, gap: 8 }}>
          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>
            Thông báo từ giảng viên
          </Text>
          {announcements.slice(0, 3).map((a) => (
            <View key={a.id} style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{a.title}</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8' }}>{new Date(a.createdAt).toLocaleDateString('vi-VN')}</Text>
              </View>
              <Text style={{ fontSize: 12.5, color: '#64748B' }}>{a.content}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
