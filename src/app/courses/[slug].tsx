import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { coursesApi } from '@/lib/api/courses';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { reviewsApi } from '@/lib/api/reviews';
import { wishlistApi } from '@/lib/api/wishlist';
import { useAuth } from '@/lib/auth/AuthContext';
import type { CourseChapter } from '@/types/course';
import type { CourseReview } from '@/types/review';

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

export default function CourseDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const { data: course, isLoading, error, refetch } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => coursesApi.getDetail(slug),
    enabled: !!slug,
  });

  const { data: wishlist } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.getMine(),
    enabled: isAuthenticated === true,
  });
  const isWished = !!course && (wishlist?.some((w) => w.courseId === course.id) ?? false);

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWished) await wishlistApi.removeItem(course!.id);
      else await wishlistApi.addItem(course!.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
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

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', flex: 1 }}>{course.title}</Text>
        {isAuthenticated ? (
          <Pressable onPress={() => wishlistMutation.mutate()} hitSlop={8}>
            <Text style={{ fontSize: 24, color: isWished ? '#DC2626' : '#CBD5E1' }}>♥</Text>
          </Pressable>
        ) : null}
      </View>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Nội dung khoá học</Text>
          {isAuthenticated ? (
            <Pressable onPress={() => router.push(`/gradebook/${course.id}` as Href)}>
              <Text style={{ color: '#2563EB' }}>Bảng điểm</Text>
            </Pressable>
          ) : null}
        </View>
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
          <Pressable
            onPress={() => router.push(`/checkout/${slug}` as Href)}
            style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Mua khoá học</Text>
          </Pressable>
        )}
      </View>

      <ReviewsSection courseId={course.id} isAuthenticated={isAuthenticated === true} />
    </ScrollView>
  );
}

function ReviewsSection({ courseId, isAuthenticated }: { courseId: number; isAuthenticated: boolean }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const { data: reviews } = useQuery({
    queryKey: ['reviews', courseId],
    queryFn: () => reviewsApi.listForCourse(courseId),
  });

  const createMutation = useMutation({
    mutationFn: () => reviewsApi.create(courseId, { rating, comment }),
    onSuccess: () => {
      setShowForm(false);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['reviews', courseId] });
    },
    onError: (err: unknown) => setReviewError(err instanceof ApiError ? err.message : 'Gửi đánh giá thất bại.'),
  });

  return (
    <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Đánh giá</Text>
        {isAuthenticated && !showForm ? (
          <Pressable onPress={() => setShowForm(true)}>
            <Text style={{ color: '#2563EB' }}>Viết đánh giá</Text>
          </Pressable>
        ) : null}
      </View>

      {showForm ? (
        <View style={{ gap: 8, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)}>
                <Text style={{ fontSize: 22, color: star <= rating ? '#F59E0B' : '#CBD5E1' }}>★</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            placeholder="Cảm nhận của bạn về khoá học..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, minHeight: 70, textAlignVertical: 'top' }}
          />
          {reviewError ? <Text style={{ color: '#DC2626', fontSize: 12 }}>{reviewError}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending || !comment.trim()}
              style={{ backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, opacity: createMutation.isPending ? 0.6 : 1 }}
            >
              {createMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Gửi</Text>}
            </Pressable>
            <Pressable onPress={() => setShowForm(false)} style={{ justifyContent: 'center' }}>
              <Text style={{ color: '#64748B' }}>Huỷ</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {reviews?.content.length === 0 ? (
        <Text style={{ color: '#64748B' }}>Chưa có đánh giá nào.</Text>
      ) : (
        reviews?.content.map((review) => <ReviewRow key={review.id} review={review} />)
      )}
    </View>
  );
}

function ReviewRow({ review }: { review: CourseReview }) {
  return (
    <View style={{ gap: 2, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '600' }}>{review.userName}</Text>
        <Text style={{ color: '#F59E0B' }}>{'★'.repeat(review.rating)}</Text>
      </View>
      {review.comment ? <Text style={{ color: '#475569' }}>{review.comment}</Text> : null}
      <Text style={{ color: '#94A3B8', fontSize: 12 }}>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</Text>
    </View>
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
