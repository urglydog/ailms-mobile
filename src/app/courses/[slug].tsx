import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { coursesApi } from '@/lib/api/courses';
import { enrollmentsApi } from '@/lib/api/enrollments';
import type { CourseChapter } from '@/types/course';

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const { data: course, isLoading, error, refetch } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => coursesApi.getDetail(slug),
    enabled: !!slug,
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollmentsApi.enrollFree(course!.id, course?.requiresPassword ? password : undefined),
    onSuccess: () => {
      setEnrollError(null);
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      router.push('/my-courses' as Href);
    },
    onError: (err: unknown) => {
      setEnrollError(err instanceof ApiError ? err.message : 'Ghi danh thất bại, vui lòng thử lại.');
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text>{error instanceof ApiError ? error.message : 'Không tải được khoá học.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: '#2563EB' }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Stack.Screen options={{ headerShown: true, title: course.title }} />

      <Text style={{ fontSize: 22, fontWeight: '700' }}>{course.title}</Text>
      <Text style={{ color: '#475569' }}>
        {course.instructorName} · {course.categoryName} · {course.level}
      </Text>
      <Text style={{ color: '#475569' }}>
        {course.learnerCount.toLocaleString('vi-VN')} học viên
        {course.avgRating ? ` · ${course.avgRating.toFixed(1)}★ (${course.reviewCount})` : ''}
      </Text>
      <Text style={{ color: '#475569' }}>{formatDuration(course.totalDurationSec)}</Text>

      <Text style={{ fontSize: 16, lineHeight: 22 }}>{course.description}</Text>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Nội dung khoá học</Text>
        {course.chapters.map((chapter) => (
          <ChapterSection key={chapter.id} chapter={chapter} />
        ))}
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16, gap: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#2563EB' }}>
          {course.isFree ? 'Miễn phí' : `${course.finalPrice.toLocaleString('vi-VN')}đ`}
        </Text>

        {course.isFree ? (
          <>
            {course.requiresPassword ? (
              <TextInput
                placeholder="Mật khẩu khoá học"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}
              />
            ) : null}
            {enrollError ? <Text style={{ color: '#DC2626' }}>{enrollError}</Text> : null}
            <Pressable
              onPress={() => enrollMutation.mutate()}
              disabled={enrollMutation.isPending}
              style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center', opacity: enrollMutation.isPending ? 0.6 : 1 }}
            >
              {enrollMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600' }}>Ghi danh miễn phí</Text>
              )}
            </Pressable>
          </>
        ) : (
          // Thanh toán khoá học trả phí (VNPay/Momo...) chưa có trên mobile — chỉ Web hỗ trợ lúc
          // này. Không build luồng thanh toán riêng ở đây vì nằm ngoài phạm vi "hiển thị dữ liệu".
          <Text style={{ color: '#64748B' }}>
            Khoá học trả phí — vui lòng mở bản Web để thanh toán và ghi danh.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function ChapterSection({ chapter }: { chapter: CourseChapter }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontWeight: '600' }}>{chapter.title}</Text>
      {chapter.lessons.map((lesson) => (
        <Pressable
          key={lesson.id}
          onPress={() => lesson.isPreview && router.push(`/lessons/${lesson.id}` as Href)}
          style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingLeft: 12 }}
        >
          <Text style={{ color: lesson.isPreview ? '#2563EB' : '#475569' }}>
            {lesson.title}
            {lesson.isPreview ? ' (xem thử)' : ''}
          </Text>
          <Text style={{ color: '#94A3B8' }}>{Math.round(lesson.durationSec / 60)} phút</Text>
        </Pressable>
      ))}
    </View>
  );
}
