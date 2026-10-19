import { useQuery } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View, useWindowDimensions, ScrollView } from 'react-native';

import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { coursesApi } from '@/lib/api/courses';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { RankingBanner } from '@/components/ranking/RankingBanner';
import { SystemAnnouncementBanner } from '@/components/system/SystemAnnouncementBanner';
import type { CourseSummary } from '@/types/course';
import { COLORS } from '@/lib/theme/colors';

export default function CoursesScreen() {
  const { isAuthenticated } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  // Debounce 400ms — tránh gọi API mỗi lần gõ 1 ký tự.
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['courses', keyword, levelFilter],
    queryFn: () => coursesApi.search({ keyword: keyword || undefined, level: levelFilter || undefined }),
    enabled: isAuthenticated === true,
  });

  if (isAuthenticated === false) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <TopNav />
      <FlatList
        data={data?.content ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={refetch}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
        ListHeaderComponent={
          <>
            <SystemAnnouncementBanner />
            <RankingBanner />
            <View style={{ padding: 16, gap: 10, paddingBottom: 0 }}>
              <Text style={{ fontSize: 20, fontWeight: '700' }}>Khoá học</Text>
              <TextInput
                placeholder="Tìm khoá học..."
                value={searchInput}
                onChangeText={setSearchInput}
                style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10 }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
                <Pressable onPress={() => setLevelFilter(null)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: levelFilter === null ? COLORS.accent : COLORS.surface }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: levelFilter === null ? '#FFF' : COLORS.inkMuted }}>Tất cả cấp độ</Text>
                </Pressable>
                <Pressable onPress={() => setLevelFilter('BEGINNER')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: levelFilter === 'BEGINNER' ? COLORS.accent : COLORS.surface }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: levelFilter === 'BEGINNER' ? '#FFF' : COLORS.inkMuted }}>Cơ bản</Text>
                </Pressable>
                <Pressable onPress={() => setLevelFilter('INTERMEDIATE')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: levelFilter === 'INTERMEDIATE' ? COLORS.accent : COLORS.surface }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: levelFilter === 'INTERMEDIATE' ? '#FFF' : COLORS.inkMuted }}>Trung cấp</Text>
                </Pressable>
                <Pressable onPress={() => setLevelFilter('ADVANCED')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: levelFilter === 'ADVANCED' ? COLORS.accent : COLORS.surface }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: levelFilter === 'ADVANCED' ? '#FFF' : COLORS.inkMuted }}>Nâng cao</Text>
                </Pressable>
              </ScrollView>
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator />
            </View>
          ) : error ? (
            <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
              <Text>{error instanceof ApiError ? error.message : 'Không tải được danh sách khoá học.'}</Text>
              <Pressable onPress={() => refetch()}>
                <Text style={{ color: COLORS.accent }}>Thử lại</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: COLORS.inkFaint }}>Không tìm thấy khoá học nào.</Text>
            </View>
          )
        }
        renderItem={({ item }) => <CourseCard course={item} />}
      />
      <BottomNav />
    </View>
  );
}

function CourseCard({ course }: { course: CourseSummary }) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 32 - 12) / 2;

  return (
    <Pressable
      onPress={() => router.push(`/courses/${course.slug}` as Href)}
      style={{ width: cardWidth, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFF' }}
    >
      {course.thumbnailUrl ? (
        <Image source={{ uri: course.thumbnailUrl }} style={{ width: '100%', height: 100 }} resizeMode="cover" />
      ) : (
        <View style={{ width: '100%', height: 100, backgroundColor: COLORS.lineSoft }} />
      )}
      <View style={{ padding: 10, gap: 4 }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B' }} numberOfLines={2}>{course.title}</Text>
        <Text style={{ color: COLORS.inkFaint, fontSize: 11 }} numberOfLines={1}>{course.instructorName}</Text>
        <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 13, marginTop: 4 }}>
          {course.isFree ? 'Miễn phí' : `${course.finalPrice.toLocaleString('vi-VN')}đ`}
        </Text>
      </View>
    </Pressable>
  );
}
