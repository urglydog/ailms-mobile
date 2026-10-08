import { useQuery } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';

import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { ApiError } from '@/lib/api/client';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Enrollment } from '@/types/enrollment';

export default function MyCoursesScreen() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => enrollmentsApi.getMine(),
    enabled: isAuthenticated === true,
  });

  if (isAuthenticated === false) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <TopNav />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Khoá học của tôi</Text>
      </View>
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{error instanceof ApiError ? error.message : 'Không tải được danh sách khoá học đã ghi danh.'}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: '#2563EB' }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#64748B' }}>Bạn chưa ghi danh khoá học nào.</Text>
        </View>
      ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => String(item.courseId)}
            refreshing={isRefetching}
            onRefresh={refetch}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
            contentContainerStyle={{ paddingBottom: 16, paddingTop: 16, gap: 12 }}
            renderItem={({ item }) => <EnrollmentCard enrollment={item} />}
          />
      )}
      <BottomNav />
    </View>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  return (
    <Pressable
      onPress={() => {
        if (enrollment.firstLessonId) router.push(`/lessons/${enrollment.firstLessonId}` as Href);
        else router.push(`/courses/${enrollment.courseSlug}` as Href);
      }}
      style={{ flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFF' }}
    >
      {enrollment.thumbnailUrl ? (
        <Image source={{ uri: enrollment.thumbnailUrl }} style={{ width: '100%', height: 100 }} resizeMode="cover" />
      ) : (
        <View style={{ width: '100%', height: 100, backgroundColor: '#E2E8F0' }} />
      )}
      <View style={{ padding: 10, gap: 6 }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B' }} numberOfLines={2}>{enrollment.courseTitle}</Text>
        <Text style={{ color: '#64748B', fontSize: 11 }} numberOfLines={1}>{enrollment.instructorName}</Text>
        <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${Math.min(100, enrollment.progressPct)}%`, backgroundColor: '#2563EB' }} />
        </View>
        <Text style={{ color: '#64748B', fontSize: 11 }}>
          {enrollment.progressPct.toFixed(0)}% hoàn thành
        </Text>
      </View>
    </Pressable>
  );
}
