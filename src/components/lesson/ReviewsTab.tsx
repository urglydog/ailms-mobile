import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { ApiError } from '@/lib/api/client';
import { reviewsApi } from '@/lib/api/reviews';
import type { CourseReview } from '@/types/review';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Port từ `fe/components/course/ReviewsSection.tsx` — bỏ kiểm tra role STUDENT trước khi hiện
 * form (web cũng không kiểm tra, cứ hiện rồi để BE từ chối nếu chưa sở hữu, xem docblock bản
 * web) — luôn hiện form, BE tự trả lỗi 403 nếu chưa đủ điều kiện (BR-ENROLL-01). */
export function ReviewsTab({ courseId }: { courseId: number }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'course', courseId],
    queryFn: () => reviewsApi.listForCourse(courseId),
  });

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const createReview = useMutation({
    mutationFn: () => reviewsApi.create(courseId, { rating, comment: comment.trim() }),
    onSuccess: () => {
      setSubmitted(true);
      setRating(0);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['reviews', 'course', courseId] });
    },
  });

  const reviews = data?.content ?? [];

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {!submitted ? (
        <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 14, gap: 10 }}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>Viết đánh giá của bạn</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} hitSlop={6}>
                <Star size={26} color="#F59E0B" fill={star <= rating ? '#F59E0B' : 'transparent'} strokeWidth={1.75} />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            placeholder="Chia sẻ cảm nhận của bạn (không bắt buộc)..."
            style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 13, minHeight: 70, textAlignVertical: 'top' }}
          />
          {createReview.error ? (
            <Text style={{ color: '#DC2626', fontSize: 12 }}>
              {createReview.error instanceof ApiError ? createReview.error.message : 'Không gửi được đánh giá.'}
            </Text>
          ) : null}
          <Pressable
            disabled={rating === 0 || createReview.isPending}
            onPress={() => createReview.mutate()}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#2563EB',
              borderRadius: 999,
              paddingVertical: 9,
              paddingHorizontal: 18,
              opacity: rating === 0 || createReview.isPending ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>
              {createReview.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ color: '#16A34A', fontSize: 13 }}>Cảm ơn bạn đã đánh giá khóa học!</Text>
      )}

      {isLoading ? <ActivityIndicator /> : null}

      {!isLoading && reviews.length === 0 ? (
        <Text style={{ color: '#64748B', fontSize: 13 }}>Chưa có đánh giá nào cho khóa học này.</Text>
      ) : null}

      <View style={{ gap: 12 }}>
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </View>
    </View>
  );
}

function ReviewCard({ review }: { review: CourseReview }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{review.userName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700', fontSize: 12.5, color: '#0F172A' }}>{review.userName}</Text>
          <Text style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(review.createdAt)}</Text>
        </View>
        <Text style={{ color: '#F59E0B', fontSize: 12 }}>
          {'★'.repeat(review.rating)}
          {'☆'.repeat(5 - review.rating)}
        </Text>
        {review.comment ? <Text style={{ fontSize: 12.5, color: '#64748B' }}>{review.comment}</Text> : null}
      </View>
    </View>
  );
}
