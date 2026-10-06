import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';

import { coursesApi } from '@/lib/api/courses';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import type { CourseSummary } from '@/types/course';

export default function CoursesScreen() {
  const { isAuthenticated, logout } = useAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesApi.search(),
    enabled: isAuthenticated === true,
  });

  if (isAuthenticated === false) {
    return <Redirect href="/login" />;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text>{error instanceof ApiError ? error.message : 'Không tải được danh sách khoá học.'}</Text>
        <Pressable onPress={() => refetch()}>
          <Text style={{ color: '#2563EB' }}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Khoá học</Text>
        <Pressable onPress={() => logout()}>
          <Text style={{ color: '#2563EB' }}>Đăng xuất</Text>
        </Pressable>
      </View>
      <FlatList
        data={data?.content ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => <CourseCard course={item} />}
      />
    </View>
  );
}

function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <View style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, overflow: 'hidden' }}>
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
    </View>
  );
}
