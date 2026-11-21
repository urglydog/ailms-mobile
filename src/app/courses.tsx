import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { categoriesApi, coursesApi } from '@/lib/api/courses';
import { LayoutGrid, List as ListIcon, X } from 'lucide-react-native';
import { CourseFiltersModal, DURATIONS, EMPTY_FILTERS, LEVELS, SORTS, type CourseFilterState } from '@/components/course/CourseFiltersModal';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { HomeShelves } from '@/components/course/HomeShelves';
import { CategoryTiles } from '@/components/course/CategoryTiles';
import { RankingBanner } from '@/components/ranking/RankingBanner';
import { SystemAnnouncementBanner } from '@/components/system/SystemAnnouncementBanner';
import type { CourseSummary, Page } from '@/types/course';
import { COLORS } from '@/lib/theme/colors';
import { CourseThumb } from '@/components/ui/CourseThumb';

export default function CoursesScreen() {
  const { isAuthenticated } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const { category: categoryParam } = useLocalSearchParams<{ category?: string }>();
  const [filters, setFilters] = useState<CourseFilterState>({ ...EMPTY_FILTERS, category: categoryParam ?? null });
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

  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<Page<CourseSummary>, Error, InfiniteData<Page<CourseSummary>>, readonly unknown[], number>({
    queryKey: ['courses', keyword, filters],
    initialPageParam: 0,
    getNextPageParam: (last) => (last.number + 1 < last.totalPages ? last.number + 1 : undefined),
    queryFn: ({ pageParam }) =>
      coursesApi.search({
        page: pageParam,
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
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <TopNav />
      <FlatList
        data={data?.pages.flatMap((p) => p.content) ?? []}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
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
            {!keyword && activeFilterCount === 0 ? <CategoryTiles onPick={(slug) => setFilters({ ...EMPTY_FILTERS, category: slug })} /> : null}
            {!keyword && activeFilterCount === 0 ? <HomeShelves /> : null}
            <RankingBanner />
            <View style={{ padding: 16, gap: 10, paddingBottom: 0 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.ink }}>Tất cả khoá học</Text>
              {data && (keyword || activeFilterCount > 0) ? (
                <Text style={{ fontSize: 12.5, color: COLORS.inkMuted }}>Tìm thấy {data.pages[0]?.totalElements ?? 0} khoá học</Text>
              ) : null}
              <TextInput
                placeholder="Tìm khoá học..."
                value={searchInput}
                onChangeText={setSearchInput}
                placeholderTextColor={COLORS.inkFaint}
                accessibilityLabel="Tìm khoá học"
                style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.ink, backgroundColor: COLORS.surfaceRaised }}
              />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 4 }}>
                <Pressable
                  onPress={() => setShowFilters(true)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: activeFilterCount > 0 ? COLORS.accent : COLORS.surface }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: activeFilterCount > 0 ? COLORS.white : COLORS.inkMuted }}>
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
            <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
              <Text style={{ color: COLORS.ink, fontWeight: '700' }}>Không tìm thấy khoá học phù hợp</Text>
              <Text style={{ color: COLORS.inkFaint, textAlign: 'center' }}>Thử bỏ một vài bộ lọc hoặc dùng từ khoá khác.</Text>
              {activeFilterCount > 0 ? (
                <Pressable onPress={() => setFilters(EMPTY_FILTERS)}>
                  <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Xoá toàn bộ bộ lọc</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ padding: 16 }}>
              <ActivityIndicator />
            </View>
          ) : data && !hasNextPage && (data.pages[0]?.totalElements ?? 0) > 0 ? (
            <Text style={{ textAlign: 'center', color: COLORS.inkFaint, fontSize: 12, padding: 16 }}>Bạn đã xem hết khoá học phù hợp.</Text>
          ) : null
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
  const thumb = list
    ? <CourseThumb url={course.thumbnailUrl} title={course.title} width={120} height="100%" />
    : <CourseThumb url={course.thumbnailUrl} title={course.title} height={(cardWidth * 9) / 16} />;

  return (
    <Pressable
      onPress={() => router.push(`/courses/${course.slug}` as Href)}
      style={{
        width: cardWidth,
        marginHorizontal: list ? 16 : 0,
        flexDirection: list ? 'row' : 'column',
        borderWidth: 1,
        borderColor: COLORS.line,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceRaised,
        minHeight: list ? 96 : undefined,
      }}
      accessibilityRole="button"
      accessibilityLabel={course.title}
    >
      {thumb}
      <View style={{ padding: 10, gap: 4, flex: list ? 1 : undefined }}>
        <Text style={{ fontWeight: '700', fontSize: 14, lineHeight: 19, color: COLORS.ink }} numberOfLines={2}>{course.title}</Text>
        <Text style={{ color: COLORS.inkFaint, fontSize: 12 }} numberOfLines={1}>{course.instructorName}</Text>
        {course.avgRating ? (
          <Text style={{ color: COLORS.inkMuted, fontSize: 12 }}>
            <Text style={{ color: COLORS.star }}>★ </Text>
            <Text style={{ fontWeight: '700', color: COLORS.ink }}>{course.avgRating.toFixed(1)}</Text> ({course.reviewCount})
          </Text>
        ) : null}
        <Text style={{ color: course.isFree ? COLORS.success : COLORS.ink, fontWeight: '800', fontSize: 14, marginTop: 2 }}>
          {course.isFree ? 'Miễn phí' : `${course.finalPrice.toLocaleString('vi-VN')}đ`}
        </Text>
      </View>
    </Pressable>
  );
}
