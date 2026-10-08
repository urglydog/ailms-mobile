import { useQuery } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';

import { TopNav } from '@/components/TopNav';
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
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={<RankingBanner />}
          renderItem={({ item }) => <CourseCard course={item} />}
        />
      )}
    </View>
  );
}

function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Pressable
      onPress={() => router.push(`/courses/${course.slug}` as Href)}
      style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, overflow: 'hidden' }}
    >
      {course.thumbnailUrl ? (
        <Image source={{ uri: course.thumbnailUrl }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
      ) : null}
      <View style={{ padding: 12, gap: 4 }}>
        <Text style={{ fontWeight: '600', fontSize: 16 }}>{course.title}</Text>
        <Text style={{ color: '#475569' }}>{course.instructorName}</Text>
        <Text style={{ color: '#2563EB', fontWeight: '600' }}>
          {course.isFree ? 'Miễn phí' : `${course.finalPrice.toLocaleString('vi-VN')}đ`}
        </Text>
      </View>
    </Pressable>
  );
}
