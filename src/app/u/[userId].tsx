import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { usersApi } from '@/lib/api/users';
import { streakApi } from '@/lib/api/streak';
import { useAuth } from '@/lib/auth/AuthContext';
import { BackButton } from '@/components/BackButton';
import type { PublicCourseSummary } from '@/types/user';

type Tab = 'courses' | 'wishlist' | 'certificates';

function formatPrice(price: number): string {
  return `${price.toLocaleString('vi-VN')}đ`;
}

/** Port từ `fe/app/(public)/u/[userId]/page.tsx` — bỏ sắp xếp chứng chỉ (dropdown) và
 * `CertificatePreview` (render ảnh chứng chỉ phức tạp, mobile chưa có màn chi tiết/xác thực
 * chứng chỉ riêng) để giữ scope gọn — chứng chỉ chỉ hiện dạng thẻ thông tin đơn giản. */
export default function PublicProfileScreen() {
  const { userId: userIdParam } = useLocalSearchParams<{ userId: string }>();
  const userId = Number(userIdParam);
  const { isAuthenticated } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['users', userId, 'public-profile'],
    queryFn: () => usersApi.getPublicProfile(userId),
    enabled: Number.isFinite(userId),
  });

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    enabled: isAuthenticated === true,
  });
  const isOwnProfile = me?.id === userId;

  const { data: streak } = useQuery({
    queryKey: ['streak'],
    queryFn: () => streakApi.getMine(),
    enabled: isOwnProfile,
  });

  const [tab, setTab] = useState<Tab>('courses');

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !profile) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Stack.Screen options={{ headerShown: true, title: 'Hồ sơ', headerLeft: () => <BackButton /> }} />
        <Text style={{ color: '#64748B' }}>{notFound ? 'Không tìm thấy người dùng này.' : 'Không tải được hồ sơ, thử lại sau.'}</Text>
      </View>
    );
  }

  const activeCourses = tab === 'courses' ? profile.courses : tab === 'wishlist' ? profile.wishlist : null;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Stack.Screen options={{ headerShown: true, title: profile.fullName, headerLeft: () => <BackButton /> }} />

      <View style={{ alignItems: 'center', gap: 8 }}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />
        ) : (
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#2563EB' }}>{profile.fullName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{profile.fullName}</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>
          {profile.role === 'INSTRUCTOR' ? 'Giảng viên' : 'Học viên'}
        </Text>
        <Text style={{ fontSize: 12, color: '#94A3B8' }}>Thành viên từ {new Date(profile.memberSince).toLocaleDateString('vi-VN')}</Text>

        {isOwnProfile ? (
          <Pressable
            onPress={() => router.push('/profile' as Href)}
            style={{ borderWidth: 1, borderColor: '#2563EB', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18, marginTop: 4 }}
          >
            <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 12.5 }}>Cài đặt tài khoản</Text>
          </Pressable>
        ) : null}
      </View>

      {isOwnProfile && streak ? (
        <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 22 }}>🔥</Text>
          <View>
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>Chuỗi {streak.currentStreak} ngày</Text>
            <Text style={{ fontSize: 11.5, color: '#92400E' }}>Kỷ lục: {streak.longestStreak} ngày</Text>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
        <TabButton label="Đã học" active={tab === 'courses'} onPress={() => setTab('courses')} />
        <TabButton label="Yêu thích" active={tab === 'wishlist'} onPress={() => setTab('wishlist')} />
        <TabButton
          label={`Chứng chỉ${profile.certificates.length > 0 ? ` (${profile.certificates.length})` : ''}`}
          active={tab === 'certificates'}
          onPress={() => setTab('certificates')}
        />
      </View>

      {tab === 'certificates' ? (
        profile.certificates.length === 0 ? (
          <Text style={{ color: '#64748B', fontSize: 13 }}>Chưa có chứng chỉ nào.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {profile.certificates.map((cert) => (
              <View key={cert.certificateCode} style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>{cert.courseTitle}</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{cert.courseCategoryName}</Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  Cấp ngày {new Date(cert.issuedAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            ))}
          </View>
        )
      ) : activeCourses === null ? (
        <Text style={{ color: '#64748B', fontSize: 13 }}>Học viên này đã ẩn mục này.</Text>
      ) : activeCourses.length === 0 ? (
        <Text style={{ color: '#64748B', fontSize: 13 }}>
          {tab === 'courses' ? 'Chưa sở hữu khóa học nào.' : 'Chưa lưu khóa học yêu thích nào.'}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {activeCourses.map((course) => (
            <CourseRow key={course.courseId} course={course} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: active ? '#2563EB' : 'transparent' }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#2563EB' : '#64748B' }}>{label}</Text>
    </Pressable>
  );
}

function CourseRow({ course }: { course: PublicCourseSummary }) {
  return (
    <Pressable
      onPress={() => router.push(`/courses/${course.slug}` as Href)}
      style={{ flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, alignItems: 'center' }}
    >
      {course.thumbnailUrl ? (
        <Image source={{ uri: course.thumbnailUrl }} style={{ width: 64, height: 40, borderRadius: 6 }} />
      ) : (
        <View style={{ width: 64, height: 40, borderRadius: 6, backgroundColor: '#F1F5F9' }} />
      )}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={{ fontWeight: '600', fontSize: 13, color: '#0F172A' }}>{course.title}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB', marginTop: 2 }}>
          {course.isFree ? 'Miễn phí' : formatPrice(course.price)}
        </Text>
      </View>
    </Pressable>
  );
}
