import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ChevronRight, Play, Search } from 'lucide-react-native';

import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { HomeShelf, SHELVES } from '@/components/course/HomeShelves';
import { CategoryTiles } from '@/components/course/CategoryTiles';
import { RankingBanner } from '@/components/ranking/RankingBanner';
import { SystemAnnouncementBanner } from '@/components/system/SystemAnnouncementBanner';
import { CourseThumb } from '@/components/ui/CourseThumb';
import { PressableScale } from '@/components/ui/PressableScale';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { usersApi } from '@/lib/api/users';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatRelative, lessonTarget, pickContinue } from '@/lib/myCourses';
import { COLORS } from '@/lib/theme/colors';

/**
 * Trang Khám phá (UI v3, tham khảo Udemy mobile). Thứ tự theo mức ưu tiên của người học:
 * chào + tìm kiếm → TIẾP TỤC HỌC → kệ khoá học (vuốt ngang, "Xem tất cả") → chủ đề (ở giữa,
 * không chiếm đầu trang) → thêm kệ → bảng xếp hạng ở cuối. Danh sách đầy đủ + bộ lọc nằm ở `/search`.
 */
export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const enabled = isAuthenticated === true;

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => usersApi.getMe(), enabled });
  const { data: enrollments } = useQuery({ queryKey: ['enrollments'], queryFn: () => enrollmentsApi.getMine(), enabled });
  const featured = enrollments ? pickContinue(enrollments) : null;

  if (isAuthenticated === false) return <Redirect href="/login" />;

  const firstName = me?.fullName?.trim().split(/\s+/).pop();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopNav />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 96, gap: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await queryClient.invalidateQueries();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ gap: 14 }}>
          <SystemAnnouncementBanner />
          <View style={{ paddingHorizontal: 16, gap: 12, paddingTop: 4 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.ink }} accessibilityRole="header">
                {firstName ? `Chào ${firstName} 👋` : 'Chào bạn 👋'}
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.inkMuted }}>Hôm nay bạn muốn học gì?</Text>
            </View>
            <Pressable
              onPress={() => router.push('/search' as Href)}
              accessibilityRole="search"
              accessibilityLabel="Tìm khoá học"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.surfaceRaised }}
            >
              <Search size={18} color={COLORS.inkFaint} />
              <Text style={{ color: COLORS.inkFaint, fontSize: 15 }}>Tìm khoá học, chủ đề, giảng viên…</Text>
            </Pressable>
          </View>
        </View>

        {featured ? (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: COLORS.ink }}>Tiếp tục học</Text>
              <Pressable onPress={() => router.push('/my-courses' as Href)} hitSlop={8}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: COLORS.accentDark }}>Khoá của tôi</Text>
              </Pressable>
            </View>
            <PressableScale
              onPress={() => router.push(lessonTarget(featured) as Href)}
              accessibilityRole="button"
              accessibilityLabel={`Tiếp tục học ${featured.courseTitle}`}
              style={{ flexDirection: 'row', height: 104, backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, overflow: 'hidden' }}
            >
              <View style={{ width: 120, height: 104 }}>
                <CourseThumb url={featured.thumbnailUrl} title={featured.courseTitle} height={104} />
              </View>
              <View style={{ flex: 1, padding: 12, gap: 6 }}>
                <Text style={{ color: COLORS.ink, fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{featured.courseTitle}</Text>
                <View style={{ height: 6, backgroundColor: COLORS.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: 6, width: `${Math.min(100, featured.progressPct)}%`, backgroundColor: COLORS.accent }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: COLORS.inkFaint, fontSize: 12 }}>
                    {Math.round(featured.progressPct)}% · {featured.lastAccessedAt ? formatRelative(featured.lastAccessedAt) : 'chưa học'}
                  </Text>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={15} color={COLORS.white} fill={COLORS.white} />
                  </View>
                </View>
              </View>
            </PressableScale>
          </View>
        ) : null}

        <HomeShelf def={SHELVES.trending} />
        <HomeShelf def={SHELVES.newest} />

        <CategoryTiles onPick={(slug) => router.push(`/search?category=${encodeURIComponent(slug)}` as Href)} />

        <HomeShelf def={SHELVES.free} />
        <HomeShelf def={SHELVES.beginner} />

        <Pressable
          onPress={() => router.push('/search' as Href)}
          style={{ marginHorizontal: 16, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <Text style={{ color: COLORS.accentDark, fontWeight: '700', fontSize: 15 }}>Xem tất cả khoá học</Text>
          <ChevronRight size={18} color={COLORS.accentDark} />
        </Pressable>

        <RankingBanner />
      </ScrollView>
      <BottomNav />
    </View>
  );
}
