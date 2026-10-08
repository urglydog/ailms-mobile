import { useQuery } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';

import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { coursesApi } from '@/lib/api/courses';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { RankingBanner } from '@/components/ranking/RankingBanner';
import { SystemAnnouncementBanner } from '@/components/system/SystemAnnouncementBanner';
import type { CourseSummary } from '@/types/course';

export default function CoursesScreen() {
  const { isAuthenticated } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');

  // Debounce 400ms — tránh gọi API mỗi lần gõ 1 ký tự.
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['courses', keyword],
    queryFn: () => coursesApi.search({ keyword: keyword || undefined }),
    enabled: isAuthenticated === true,
  });

  if (isAuthenticated === false) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <TopNav />
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Khoá học</Text>
        <TextInput
          placeholder="Tìm khoá học..."
          value={searchInput}
          onChangeText={setSearchInput}
          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10 }}
        />
      </View>
      <SystemAnnouncementBanner />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được danh sách khoá học.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: '#2563EB' }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.content ?? []}
          keyExtractor={(item) => String(item.id)}
          refreshing={isRefetching}
          onRefresh={refetch}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 16, paddingTop: 16, gap: 12 }}
          ListHeaderComponent={<RankingBanner />}
          ListHeaderComponentStyle={{ marginBottom: 12, paddingHorizontal: 16 }}
          renderItem={({ item }) => <CourseCard course={item} />}
        />
      )}
      <BottomNav />
    </View>
  );
}

function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Pressable
      onPress={() => router.push(`/courses/${course.slug}` as Href)}
      style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFF' }}
    >
      {course.thumbnailUrl ? (
        <Image source={{ uri: course.thumbnailUrl }} style={{ width: '100%', height: 100 }} resizeMode="cover" />
      ) : (
        <View style={{ width: '100%', height: 100, backgroundColor: '#E2E8F0' }} />
      )}
      <View style={{ padding: 10, gap: 4 }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B' }} numberOfLines={2}>{course.title}</Text>
        <Text style={{ color: '#64748B', fontSize: 11 }} numberOfLines={1}>{course.instructorName}</Text>
        <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 13, marginTop: 4 }}>
          {course.isFree ? 'Miễn phí' : `${course.finalPrice.toLocaleString('vi-VN')}đ`}
        </Text>
      </View>
    </Pressable>
  );
}
