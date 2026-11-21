import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { coursesApi } from '@/lib/api/courses';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { reviewsApi } from '@/lib/api/reviews';
import { wishlistApi } from '@/lib/api/wishlist';
import { cartApi } from '@/lib/api/cart';
import { captureReferral } from '@/lib/referral';
import { useAuth } from '@/lib/auth/AuthContext';
import { BackButton } from '@/components/BackButton';
import { LiveBanner } from '@/components/course/LiveBanner';
import { BundleUpsellWidget } from '@/components/course/BundleUpsellWidget';
import { CourseDubbingPanel } from '@/components/course/CourseDubbingPanel';
import { RelatedCourses } from '@/components/course/RelatedCourses';
import type { CourseChapter } from '@/types/course';
import type { CourseReview } from '@/types/review';
import { COLORS } from '@/lib/theme/colors';
import { PressableScale } from '@/components/ui/PressableScale';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { CourseThumb } from '@/components/ui/CourseThumb';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { LEVELS } from '@/components/course/CourseFiltersModal';
import { ELEVATION } from '@/lib/theme/tokens';
import { Clock, Heart, Lock, PlayCircle, Star, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

export default function CourseDetailScreen() {
  const { slug, ref } = useLocalSearchParams<{ slug: string; ref?: string }>();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const insets = useSafeAreaInsets();

  const { data: course, isLoading, error, refetch } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => coursesApi.getDetail(slug),
    enabled: !!slug,
  });

  // Ghi lại mã giới thiệu của Giảng viên (`?ref=`) để dùng lúc thanh toán (chia doanh thu 97/3).
  useEffect(() => {
    if (course && ref) void captureReferral(course.id, ref);
  }, [course, ref]);

  const { data: wishlist } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.getMine(),
    enabled: isAuthenticated === true,
  });
  const isWished = !!course && (wishlist?.some((w) => w.courseId === course.id) ?? false);

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.list(),
    enabled: isAuthenticated === true,
  });
  const isInCart = !!course && (cart?.some((c) => c.courseId === course.id) ?? false);

  const cartMutation = useMutation({
    mutationFn: async () => {
      if (isInCart) await cartApi.remove(course!.id);
      else await cartApi.add(course!.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

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
        <Text style={{ color: COLORS.ink }}>{error instanceof ApiError ? error.message : 'Không tải được khoá học.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: COLORS.accentDark }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  const priceLabel = course.isFree ? 'Miễn phí' : `${course.finalPrice.toLocaleString('vi-VN')}đ`;
  const levelLabel = LEVELS.find((l) => l.value === course.level)?.label ?? course.level;
  const lessonCount = course.chapters.reduce((n, c) => n + c.lessons.length, 0);
  const primaryAction = course.isFree
    ? { label: 'Ghi danh miễn phí', onPress: () => enrollMutation.mutate(), pending: enrollMutation.isPending }
    : { label: 'Mua ngay', onPress: () => router.push(`/checkout/${slug}` as Href), pending: false };

  // UI v2 (21/11/2026): ảnh bìa + nhãn thông tin dạng chip, mô tả hiển thị Markdown (trước đây in thô
  // các dấu "##"), thanh giá + nút hành động chính cố định ở đáy để lúc nào cũng bấm được.
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 112 + insets.bottom }}>
      <Stack.Screen options={{ headerShown: true, title: course.title, headerLeft: () => <BackButton /> }} />

      <CourseThumb url={course.thumbnailUrl} title={course.title} height={180} radius={12} />

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <Text style={{ fontSize: 22, lineHeight: 28, fontWeight: '800', color: COLORS.ink, flex: 1 }} accessibilityRole="header">{course.title}</Text>
          {isAuthenticated ? (
            <Pressable
              onPress={() => wishlistMutation.mutate()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isWished ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.line }}
            >
              <Heart size={20} color={isWished ? COLORS.danger : COLORS.inkMuted} fill={isWished ? COLORS.danger : 'transparent'} />
            </Pressable>
          ) : null}
        </View>
        <Text style={{ fontSize: 14, color: COLORS.inkMuted }}>
          Giảng viên <Text style={{ fontWeight: '700', color: COLORS.ink }}>{course.instructorName}</Text>
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <MetaChip>{course.categoryName}</MetaChip>
          <MetaChip>{levelLabel}</MetaChip>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {course.avgRating ? (
            <Stat icon={<Star size={15} color={COLORS.star} fill={COLORS.star} />} text={`${course.avgRating.toFixed(1)} (${course.reviewCount})`} />
          ) : null}
          <Stat icon={<Users size={15} color={COLORS.inkMuted} />} text={`${course.learnerCount.toLocaleString('vi-VN')} học viên`} />
          <Stat icon={<Clock size={15} color={COLORS.inkMuted} />} text={formatDuration(course.totalDurationSec)} />
        </View>
      </View>

      <LiveBanner courseId={course.id} />
      <CourseDubbingPanel languages={course.dubbedLanguages ?? []} />

      {course.description ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.ink }}>Giới thiệu</Text>
          <View style={{ maxHeight: descExpanded ? undefined : 220, overflow: 'hidden' }}>
            <MarkdownRenderer content={course.description} />
          </View>
          <Pressable onPress={() => setDescExpanded((v) => !v)} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
            <Text style={{ color: COLORS.accentDark, fontWeight: '700' }}>{descExpanded ? 'Thu gọn' : 'Xem thêm'}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.ink }}>Nội dung khoá học</Text>
          {isAuthenticated ? (
            <Pressable onPress={() => router.push(`/gradebook/${course.id}` as Href)} hitSlop={8}>
              <Text style={{ color: COLORS.accentDark, fontWeight: '600' }}>Bảng điểm</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ fontSize: 13, color: COLORS.inkFaint }}>
          {course.chapters.length} chương · {lessonCount} bài học
        </Text>
        <View style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, backgroundColor: COLORS.surfaceRaised, overflow: 'hidden' }}>
          {course.chapters.map((chapter, i) => (
            <ChapterSection key={chapter.id} chapter={chapter} index={i} />
          ))}
        </View>
      </View>

      {(course.isFree && (course.requiresPassword || enrollError)) || (!course.isFree && isAuthenticated) ? (
        <View style={{ gap: 8 }}>
          {course.isFree && course.requiresPassword ? (
            <PasswordInput
              placeholder="Mật khẩu khoá học"
              value={password}
              onChangeText={setPassword}
              style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 12, backgroundColor: COLORS.surfaceRaised }}
            />
          ) : null}
          {enrollError ? <Text style={{ color: COLORS.danger }}>{enrollError}</Text> : null}
          {!course.isFree && isAuthenticated ? (
            <Pressable
              onPress={() => cartMutation.mutate()}
              disabled={cartMutation.isPending}
              accessibilityRole="button"
              style={{ borderWidth: 1, borderColor: COLORS.accent, backgroundColor: isInCart ? COLORS.tint : COLORS.surfaceRaised, borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: cartMutation.isPending ? 0.6 : 1 }}
            >
              <Text style={{ color: COLORS.accentDark, fontWeight: '700' }}>
                {isInCart ? 'Đã thêm vào giỏ hàng' : 'Thêm vào giỏ hàng'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <BundleUpsellWidget courseId={course.id} />

      <ReviewsSection courseId={course.id} isAuthenticated={isAuthenticated === true} />

      <View style={{ marginHorizontal: -16 }}>
        <RelatedCourses categorySlug={course.categorySlug} courseId={course.id} />
      </View>
    </ScrollView>

      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: COLORS.surfaceRaised, borderTopWidth: 1, borderTopColor: COLORS.line,
          ...ELEVATION.raised,
        }}
      >
        <View style={{ flex: 1 }}>
          {!course.isFree && course.finalPrice < course.price ? (
            <Text style={{ fontSize: 12, color: COLORS.inkFaint, textDecorationLine: 'line-through' }}>{course.price.toLocaleString('vi-VN')}đ</Text>
          ) : null}
          <Text style={{ fontSize: 20, fontWeight: '800', color: course.isFree ? COLORS.success : COLORS.ink }}>{priceLabel}</Text>
        </View>
        <PressableScale
          onPress={primaryAction.onPress}
          disabled={primaryAction.pending}
          accessibilityRole="button"
          containerStyle={{ flex: 1.4 }}
          style={{ backgroundColor: COLORS.accent, borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: primaryAction.pending ? 0.6 : 1 }}
        >
          {primaryAction.pending ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 15 }}>{primaryAction.label}</Text>}
        </PressableScale>
      </View>
    </View>
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
    <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: COLORS.lineSoft, paddingTop: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: COLORS.ink, fontSize: 18, fontWeight: '700' }}>Đánh giá</Text>
        {isAuthenticated && !showForm ? (
          <Pressable onPress={() => setShowForm(true)}>
            <Text style={{ color: COLORS.accentDark }}>Viết đánh giá</Text>
          </Pressable>
        ) : null}
      </View>

      {showForm ? (
        <View style={{ gap: 8, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 12 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)}>
                <Text style={{ fontSize: 22, color: star <= rating ? COLORS.star : COLORS.line }}>★</Text>
              </Pressable>
            ))}
          </View>
          <TextInput placeholderTextColor={COLORS.inkFaint}
            placeholder="Cảm nhận của bạn về khoá học..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            style={{ color: COLORS.ink, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10, minHeight: 70, textAlignVertical: 'top' }}
          />
          {reviewError ? <Text style={{ color: COLORS.danger, fontSize: 12 }}>{reviewError}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending || !comment.trim()}
              style={{ backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, opacity: createMutation.isPending ? 0.6 : 1 }}
            >
              {createMutation.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: '600' }}>Gửi</Text>}
            </Pressable>
            <Pressable onPress={() => setShowForm(false)} style={{ justifyContent: 'center' }}>
              <Text style={{ color: COLORS.inkFaint }}>Huỷ</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {reviews?.content.length === 0 ? (
        <Text style={{ color: COLORS.inkFaint }}>Chưa có đánh giá nào.</Text>
      ) : (
        reviews?.content.map((review) => <ReviewRow key={review.id} review={review} />)
      )}
    </View>
  );
}

function ReviewRow({ review }: { review: CourseReview }) {
  return (
    <View style={{ gap: 2, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.surface }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: COLORS.ink, fontWeight: '600' }}>{review.userName}</Text>
        <Text style={{ color: COLORS.star }}>{'★'.repeat(review.rating)}</Text>
      </View>
      {review.comment ? <Text style={{ color: COLORS.inkMuted }}>{review.comment}</Text> : null}
      <Text style={{ color: COLORS.lineDot, fontSize: 12 }}>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</Text>
    </View>
  );
}

function ChapterSection({ chapter, index }: { chapter: CourseChapter; index: number }) {
  return (
    <View style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: COLORS.lineSoft }}>
      <Text style={{ fontWeight: '700', color: COLORS.ink, fontSize: 14.5, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
        {index + 1}. {chapter.title}
      </Text>
      {chapter.lessons.map((lesson) => (
        <Pressable
          key={lesson.id}
          onPress={() => lesson.isPreview && router.push(`/lessons/${lesson.id}` as Href)}
          disabled={!lesson.isPreview}
          accessibilityRole={lesson.isPreview ? 'button' : undefined}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          {lesson.isPreview ? <PlayCircle size={16} color={COLORS.accent} /> : <Lock size={14} color={COLORS.inkFaint} />}
          <Text style={{ flex: 1, color: lesson.isPreview ? COLORS.accentDark : COLORS.inkMuted, fontSize: 14 }} numberOfLines={2}>
            {lesson.title}
          </Text>
          {lesson.isPreview ? (
            <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.accentDark, backgroundColor: COLORS.tint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' }}>Xem thử</Text>
          ) : null}
          <Text style={{ color: COLORS.inkFaint, fontSize: 12 }}>{Math.max(1, Math.round(lesson.durationSec / 60))} phút</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.inkMuted, backgroundColor: COLORS.lineSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' }}>
      {children}
    </Text>
  );
}

function Stat({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {icon}
      <Text style={{ fontSize: 13, color: COLORS.inkMuted, fontWeight: '500' }}>{text}</Text>
    </View>
  );
}
