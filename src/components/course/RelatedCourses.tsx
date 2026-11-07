import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { coursesApi } from '@/lib/api/courses';
import { COLORS } from '@/lib/theme/colors';

/** "Khóa học liên quan": cùng danh mục (xếp theo đánh giá), bỏ khóa đang xem — port từ `fe/hooks/useRelatedCourses.ts`. */
export function RelatedCourses({ categorySlug, courseId }: { categorySlug: string; courseId: number }) {
  const { data } = useQuery({
    queryKey: ['courses', 'related', categorySlug, courseId],
    queryFn: async () => {
      const page = await coursesApi.search({ categorySlug, sortBy: 'rating' });
      return page.content.filter((c) => c.id !== courseId).slice(0, 9);
    },
    staleTime: 60_000,
  });

  if (!data || data.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink }}>Khóa học liên quan</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {data.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/courses/${c.slug}` as Href)}
            style={{ width: 170, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' }}
          >
            {c.thumbnailUrl ? (
              <Image source={{ uri: c.thumbnailUrl }} style={{ width: '100%', height: 96 }} resizeMode="cover" />
            ) : (
              <View style={{ width: '100%', height: 96, backgroundColor: COLORS.lineSoft }} />
            )}
            <View style={{ padding: 8, gap: 2 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.ink }} numberOfLines={2}>{c.title}</Text>
              <Text style={{ fontSize: 11, color: COLORS.inkFaint }} numberOfLines={1}>{c.instructorName}</Text>
              <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.accent }}>
                {c.isFree ? 'Miễn phí' : `${c.finalPrice.toLocaleString('vi-VN')}đ`}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
