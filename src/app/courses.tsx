import { useQuery } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { categoriesApi, coursesApi } from '@/lib/api/courses';
import { LayoutGrid, List as ListIcon, X } from 'lucide-react-native';
import { CourseFiltersModal, DURATIONS, EMPTY_FILTERS, LEVELS, SORTS, type CourseFilterState } from '@/components/course/CourseFiltersModal';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { HomeShelves } from '@/components/course/HomeShelves';
import { RankingBanner } from '@/components/ranking/RankingBanner';
import { SystemAnnouncementBanner } from '@/components/system/SystemAnnouncementBanner';
import type { CourseSummary } from '@/types/course';
import { COLORS } from '@/lib/theme/colors';

export default function CoursesScreen() {
  const { isAuthenticated } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<CourseFilterState>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const activeFilterCount =
    (filters.category ? 1 : 0) + (filters.level ? 1 : 0) + (filters.priceType !== 'all' ? 1 : 0) +
    (filters.minRating ? 1 : 0) + (filters.durationBucket ? 1 : 0) + (filters.sortBy !== 'newest' ? 1 : 0);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list(), staleTime: 10 * 60 * 1000 });

  // Debounce 400ms — tránh gọi API mỗi lần gõ 1 ký tự.
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['courses', keyword, filters],
    queryFn: () =>
      coursesApi.search({
        keyword: keyword || undefined,
        categorySlug: filters.category ?? undefined,
        level: filters.level ?? undefined,
        priceType: filters.priceType,
        minRating: filters.minRating ?? undefined,
        durationBucket: filters.durationBucket ?? undefined,
        sortBy: filters.sortBy,
      }),
    enabled: isAuthenticated === true,
  });

  // Chip các bộ lọc đang áp dụng — bấm × để gỡ từng cái (cổng từ `fe` ActiveFilters).
  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.category) {
    const name = categories?.find((c) => c.slug === filters.category)?.name ?? filters.category;
    activeChips.push({ key: 'category', label: name, clear: () => setFilters({ ...filters, category: null }) });
  }
  if (filters.level) {
    activeChips.push({ key: 'level', label: LEVELS.find((l) => l.value === filters.level)?.label ?? filters.level, clear: () => setFilters({ ...filters, level: null }) });
  }
  if (filters.priceType !== 'all') {
    activeChips.push({ key: 'price', label: filters.priceType === 'free' ? 'Miễn phí' : 'Có phí', clear: () => setFilters({ ...filters, priceType: 'all' }) });
  }
  if (filters.minRating) {
    activeChips.push({ key: 'rating', label: `Từ ${filters.minRating}★`, clear: () => setFilters({ ...filters, minRating: null }) });
  }
  if (filters.durationBucket) {
    activeChips.push({ key: 'duration', label: DURATIONS.find((d) => d.value === filters.durationBucket)?.label ?? filters.durationBucket, clear: () => setFilters({ ...filters, durationBucket: null }) });
  }
  if (filters.sortBy !== 'newest') {
    activeChips.push({ key: 'sort', label: SORTS.find((x) => x.value === filters.sortBy)?.label ?? filters.sortBy, clear: () => setFilters({ ...filters, sortBy: 'newest' }) });
  }

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
        key={view}
        numColumns={view === 'grid' ? 2 : 1}
        columnWrapperStyle={view === 'grid' ? { gap: 12, paddingHorizontal: 16 } : undefined}
        contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
        ListHeaderComponent={
          <>
            <SystemAnnouncementBanner />
            {!keyword && activeFilterCount === 0 ? <HomeShelves /> : null}
            <RankingBanner />
            <View style={{ padding: 16, gap: 10, paddingBottom: 0 }}>
              <Text style={{ fontSize: 20, fontWeight: '700' }}>Khoá học</Text>
              <TextInput
                placeholder="Tìm khoá học..."
                value={searchInput}
                onChangeText={setSearchInput}
                style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 10 }}
              />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 4 }}>
                <Pressable
                  onPress={() => setShowFilters(true)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: activeFilterCount > 0 ? COLORS.accent : COLORS.surface }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: activeFilterCount > 0 ? '#FFF' : COLORS.inkMuted }}>
                    Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                  </Text>
                </Pressable>
                {activeFilterCount > 0 ? (
                  <Pressable onPress={() => setFilters(EMPTY_FILTERS)}>
                    <Text style={{ fontSize: 13, color: COLORS.accent, fontWeight: '600' }}>Xóa lọc</Text>
                  </Pressable>
                ) : null}
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => setView(view === 'grid' ? 'list' : 'grid')} accessibilityLabel="Đổi kiểu hiển thị" hitSlop={8}>
                  {view === 'grid' ? <ListIcon size={20} color={COLORS.inkMuted} /> : <LayoutGrid size={20} color={COLORS.inkMuted} />}
                </Pressable>
              </View>
              {activeChips.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {activeChips.map((chip) => (
                    <Pressable
                      key={chip.key}
                      onPress={chip.clear}
                      accessibilityLabel={`Gỡ bộ lọc ${chip.label}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10, paddingRight: 6, paddingVertical: 5, borderRadius: 999, backgroundColor: COLORS.tint }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.accent }}>{chip.label}</Text>
                      <X size={13} color={COLORS.accent} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
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
        renderItem={({ item }) => <CourseCard course={item} list={view === 'list'} />}
      />
      <CourseFiltersModal
        visible={showFilters}
        filters={filters}
        categories={categories ?? []}
        onChange={setFilters}
        onClose={() => setShowFilters(false)}
      />
      <BottomNav />
    </View>
  );
}

function CourseCard({ course, list }: { course: CourseSummary; list: boolean }) {
  const { width } = useWindowDimensions();
  const cardWidth = list ? width - 32 : (width - 32 - 12) / 2;
  const thumb = course.thumbnailUrl ? (
    <Image source={{ uri: course.thumbnailUrl }} style={list ? { width: 120, height: '100%', minHeight: 96 } : { width: '100%', height: 100 }} resizeMode="cover" />
  ) : (
    <View style={list ? { width: 120, minHeight: 96, backgroundColor: COLORS.lineSoft } : { width: '100%', height: 100, backgroundColor: COLORS.lineSoft }} />
  );

  return (
    <Pressable
      onPress={() => router.push(`/courses/${course.slug}` as Href)}
      style={{
        width: cardWidth,
        marginHorizontal: list ? 16 : 0,
        flexDirection: list ? 'row' : 'column',
        borderWidth: 1,
        borderColor: COLORS.line,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#FFF',
      }}
    >
      {thumb}
      <View style={{ padding: 10, gap: 4, flex: list ? 1 : undefined }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E293B' }} numberOfLines={2}>{course.title}</Text>
        <Text style={{ color: COLORS.inkFaint, fontSize: 11 }} numberOfLines={1}>{course.instructorName}</Text>
        {course.avgRating ? (
          <Text style={{ color: COLORS.inkMuted, fontSize: 11 }}>★ {course.avgRating.toFixed(1)} ({course.reviewCount})</Text>
        ) : null}
        <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 13, marginTop: 4 }}>
          {course.isFree ? 'Miễn phí' : `${course.finalPrice.toLocaleString('vi-VN')}đ`}
        </Text>
      </View>
    </Pressable>
  );
}
