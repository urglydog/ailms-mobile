import { router, type Href } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { COLORS } from '@/lib/theme/colors';
import type { CourseSummary } from '@/types/course';

/** Kệ khóa học cuộn ngang — dùng cho trang chủ (thịnh hành/mới/miễn phí/người mới) và "Khóa học liên quan". */
export function CourseShelf({ title, courses }: { title: string; courses: CourseSummary[] }) {
  if (courses.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink }}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {courses.map((c) => (
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
              {c.avgRating ? <Text style={{ fontSize: 11, color: COLORS.inkMuted }}>★ {c.avgRating.toFixed(1)} ({c.reviewCount})</Text> : null}
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
