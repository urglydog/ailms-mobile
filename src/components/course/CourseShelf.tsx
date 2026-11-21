import type React from 'react';
import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { COLORS } from '@/lib/theme/colors';
import { PressableScale } from '@/components/ui/PressableScale';
import { CourseThumb } from '@/components/ui/CourseThumb';
import type { CourseSummary } from '@/types/course';

/**
 * Kệ khóa học cuộn ngang (UI v3, kiểu Udemy): thẻ rộng ~68% màn hình để thẻ kế tiếp luôn "ló" ra —
 * người dùng thấy ngay là vuốt được; cuộn có snap theo thẻ. Trên web có thêm 2 nút mũi tên vì chuột
 * không vuốt ngang được. `seeAllHref` hiện nút "Xem tất cả" ở tiêu đề.
 */
export function CourseShelf({ title, subtitle, courses, seeAllHref }: { title: string; subtitle?: string; courses: CourseSummary[]; seeAllHref?: Href }) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [x, setX] = useState(0);
  if (courses.length === 0) return null;

  const cardWidth = Math.min(280, Math.round((width - 32) * 0.68));
  const step = cardWidth + 12;
  const scrollBy = (dir: 1 | -1) => scrollRef.current?.scrollTo({ x: Math.max(0, x + dir * step * 2), animated: true });

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: COLORS.ink }} accessibilityRole="header" numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={{ fontSize: 13, color: COLORS.inkMuted }} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {Platform.OS === 'web' && width >= 520 ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <ArrowBtn onPress={() => scrollBy(-1)} label="Cuộn trái" Icon={ChevronLeft} />
            <ArrowBtn onPress={() => scrollBy(1)} label="Cuộn phải" Icon={ChevronRight} />
          </View>
        ) : null}
        {seeAllHref ? (
          <Pressable onPress={() => router.push(seeAllHref)} hitSlop={8} accessibilityRole="link" style={{ paddingVertical: 4, flexShrink: 0 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: COLORS.accentDark }}>Xem tất cả</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={64}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
      >
        {courses.map((c) => (
          <PressableScale
            key={c.id}
            onPress={() => router.push(`/courses/${c.slug}` as Href)}
            accessibilityRole="button"
            accessibilityLabel={c.title}
            style={{ width: cardWidth }}
          >
            <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.lineSoft }}>
              <CourseThumb url={c.thumbnailUrl} title={c.title} height={Math.round((cardWidth * 9) / 16)} />
            </View>
            <View style={{ paddingTop: 8, gap: 3 }}>
              <Text style={{ fontWeight: '700', fontSize: 14.5, lineHeight: 19, color: COLORS.ink }} numberOfLines={2}>{c.title}</Text>
              <Text style={{ fontSize: 12.5, color: COLORS.inkFaint }} numberOfLines={1}>{c.instructorName}</Text>
              {c.avgRating ? (
                <Text style={{ fontSize: 12.5, color: COLORS.inkMuted }}>
                  <Text style={{ fontWeight: '800', color: COLORS.warningInk }}>{c.avgRating.toFixed(1)} </Text>
                  <Text style={{ color: COLORS.star }}>★</Text> ({c.reviewCount})
                </Text>
              ) : null}
              <Text style={{ fontWeight: '800', fontSize: 15, color: c.isFree ? COLORS.success : COLORS.ink }}>
                {c.isFree ? 'Miễn phí' : `${c.finalPrice.toLocaleString('vi-VN')}đ`}
              </Text>
            </View>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

function ArrowBtn({ onPress, label, Icon }: { onPress: () => void; label: string; Icon: typeof ChevronLeft }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceRaised }}
    >
      <Icon size={16} color={COLORS.inkMuted} />
    </Pressable>
  );
}
