import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ArrowUpDown, Award, Flame, GraduationCap, LayoutGrid, List as ListIcon, Play, Search } from 'lucide-react-native';

import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { QueryError } from '@/components/QueryError';
import { CourseShelf } from '@/components/course/CourseShelf';
import { Reveal } from '@/components/ui/Reveal';
import { coursesApi } from '@/lib/api/courses';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { streakApi } from '@/lib/api/streak';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  countByStatus,
  filterAndSort,
  formatRelative,
  lessonTarget,
  pickCompleted,
  pickContinue,
  type SortOption,
  type StatusFilter,
} from '@/lib/myCourses';
import type { Enrollment } from '@/types/enrollment';
import { COLORS } from '@/lib/theme/colors';
import { CourseThumb } from '@/components/ui/CourseThumb';

const STATUS_LABEL: Record<StatusFilter, string> = { all: 'Tất cả', 'in-progress': 'Đang học', completed: 'Hoàn thành' };
const SORTS: { value: SortOption; label: string }[] = [
  { value: 'recently-accessed', label: 'Học gần đây' },
  { value: 'recently-enrolled', label: 'Mới ghi danh' },
  { value: 'title-asc', label: 'A → Z' },
  { value: 'title-desc', label: 'Z → A' },
];

export default function MyCoursesScreen() {
  const { isAuthenticated } = useAuth();
  const enabled = isAuthenticated === true;

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => enrollmentsApi.getMine(),
    enabled,
  });
  const { data: streak } = useQuery({ queryKey: ['streak'], queryFn: () => streakApi.getMine(), enabled });
  const { data: trending } = useQuery({
    queryKey: ['home-shelf', 'trending'],
    queryFn: async () => (await coursesApi.search({ sortBy: 'rating' })).content.slice(0, 9),
    staleTime: 60_000,
    enabled,
  });

  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOption>('recently-accessed');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const courses = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => countByStatus(courses), [courses]);
  const visible = useMemo(() => filterAndSort(courses, { status, query, sort }), [courses, status, query, sort]);
  const featured = pickContinue(courses);
  const completedFeatured = featured ? null : pickCompleted(courses);
  const certificates = courses.filter((c) => c.certificateCode).length;
  const suggestions = useMemo(() => {
    const owned = new Set(courses.map((c) => c.courseId));
    return (trending ?? []).filter((c) => !owned.has(c.id)).slice(0, 6);
  }, [trending, courses]);

  if (isAuthenticated === false) return <Redirect href="/login" />;

  const sortLabel = SORTS.find((x) => x.value === sort)?.label ?? '';
  const cycleSort = () => setSort(SORTS[(SORTS.findIndex((x) => x.value === sort) + 1) % SORTS.length]!.value);

  const header = (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.ink }}>Khoá học của tôi</Text>
        {courses.length > 0 ? (
          <Pressable onPress={() => setView(view === 'grid' ? 'list' : 'grid')} accessibilityLabel="Đổi kiểu hiển thị" hitSlop={8}>
            {view === 'grid' ? <ListIcon size={20} color={COLORS.inkMuted} /> : <LayoutGrid size={20} color={COLORS.inkMuted} />}
          </Pressable>
        ) : null}
      </View>

      {courses.length > 0 ? (
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, backgroundColor: COLORS.white, paddingVertical: 10 }}>
          <Stat icon={<Flame size={15} color={COLORS.streakInk} />} value={`${streak?.currentStreak ?? 0}`} label="Ngày liên tiếp" />
          <View style={{ width: 1, backgroundColor: COLORS.lineSoft }} />
          <Stat icon={<Play size={15} color={COLORS.accentDark} />} value={String(counts['in-progress'])} label="Đang học" />
          <View style={{ width: 1, backgroundColor: COLORS.lineSoft }} />
          <Stat icon={<Award size={15} color={COLORS.successInk} />} value={String(certificates)} label="Chứng chỉ" />
        </View>
      ) : null}

      {featured ? (
        <Pressable
          onPress={() => router.push(lessonTarget(featured) as Href)}
          style={{ flexDirection: 'row', backgroundColor: COLORS.accent, borderRadius: 12, overflow: 'hidden' }}
        >
          <View style={{ width: 104 }}>
            <Thumb url={featured.thumbnailUrl} height={112} />
          </View>
          <View style={{ flex: 1, padding: 12, gap: 5, justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>TIẾP TỤC HỌC</Text>
            <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700' }} numberOfLines={2}>{featured.courseTitle}</Text>
            <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 5, width: `${Math.min(100, featured.progressPct)}%`, backgroundColor: COLORS.highlight }} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11 }}>
              {Math.round(featured.progressPct)}%{featured.lastAccessedAt ? ` · học ${formatRelative(featured.lastAccessedAt)}` : ''}
            </Text>
          </View>
        </Pressable>
      ) : completedFeatured ? (
        <View style={{ borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, gap: 4, backgroundColor: COLORS.successTint }}>
          <Text style={{ color: COLORS.successInk, fontSize: 11, fontWeight: '700' }}>ĐÃ HOÀN THÀNH TẤT CẢ</Text>
          <Text style={{ color: COLORS.ink, fontSize: 14, fontWeight: '700' }} numberOfLines={2}>{completedFeatured.courseTitle}</Text>
          {completedFeatured.certificateCode ? (
            <Pressable onPress={() => router.push('/certificates' as Href)} hitSlop={8}>
              <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 13 }}>Xem chứng chỉ →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {courses.length > 0 ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, paddingHorizontal: 10, backgroundColor: COLORS.white }}>
            <Search size={16} color={COLORS.inkFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm trong khoá học của tôi"
              placeholderTextColor={COLORS.lineDot}
              style={{ flex: 1, paddingVertical: 9, color: COLORS.ink }}
              returnKeyType="search"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexShrink: 1 }}>
              {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((k) => (
                <Chip key={k} label={`${STATUS_LABEL[k]} ${counts[k]}`} active={status === k} onPress={() => setStatus(k)} />
              ))}
            </View>
            <Pressable onPress={cycleSort} hitSlop={8} accessibilityLabel="Đổi cách sắp xếp" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ArrowUpDown size={14} color={COLORS.inkMuted} />
              <Text style={{ fontSize: 12, color: COLORS.inkMuted, fontWeight: '600' }} numberOfLines={1}>{sortLabel}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );

  const showSuggestions = courses.length === 0 || (!featured && suggestions.length > 0);
  const footer = showSuggestions && suggestions.length > 0 ? (
    <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
      <CourseShelf title={courses.length === 0 ? 'Đang thịnh hành' : 'Khoá học tiếp theo cho bạn'} courses={suggestions} />
    </View>
  ) : null;

  return (
    <View style={{ flex: 1 }}>
      <TopNav />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : (
        <FlatList
          key={view}
          data={visible}
          keyExtractor={(item) => String(item.courseId)}
          refreshing={isRefetching}
          onRefresh={refetch}
          numColumns={view === 'grid' ? 2 : 1}
          columnWrapperStyle={view === 'grid' ? { gap: 12, paddingHorizontal: 16 } : undefined}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListEmptyComponent={
            courses.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
                <GraduationCap size={34} color={COLORS.accent} />
                <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.ink }}>Bạn chưa ghi danh khoá học nào</Text>
                <Pressable onPress={() => router.push('/courses' as Href)} style={{ backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ color: COLORS.white, fontWeight: '700' }}>Khám phá khoá học</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', color: COLORS.inkFaint, padding: 24 }}>Không tìm thấy khoá học phù hợp.</Text>
            )
          }
          ListFooterComponent={footer}
          renderItem={({ item, index }) => (
            <Reveal index={index} style={view === 'grid' ? { flex: 1 } : { paddingHorizontal: 16 }}>
              {view === 'grid' ? <GridCard enrollment={item} /> : <RowCard enrollment={item} />}
            </Reveal>
          )}
        />
      )}
      <BottomNav />
    </View>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {icon}
        <Text style={{ fontWeight: '800', fontSize: 16, color: COLORS.ink }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 10.5, color: COLORS.inkFaint }}>{label}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: active ? COLORS.accent : COLORS.line,
        backgroundColor: active ? COLORS.tint : COLORS.white,
      }}
    >
      <Text style={{ color: active ? COLORS.accent : COLORS.inkMuted, fontWeight: '600', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

function Thumb({ url, height }: { url: string | null; height: number }) {
  return <CourseThumb url={url} height={height} />;
}

function Progress({ pct }: { pct: number }) {
  return (
    <View style={{ height: 6, backgroundColor: COLORS.lineSoft, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ height: 6, width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? COLORS.success : COLORS.accent }} />
    </View>
  );
}

function open(e: Enrollment) {
  router.push(lessonTarget(e) as Href);
}

function GridCard({ enrollment }: { enrollment: Enrollment }) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 32 - 12) / 2;
  return (
    <Pressable onPress={() => open(enrollment)} style={{ width: cardWidth, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.white }}>
      <Thumb url={enrollment.thumbnailUrl} height={100} />
      <View style={{ padding: 10, gap: 6 }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.ink }} numberOfLines={2}>{enrollment.courseTitle}</Text>
        <Text style={{ color: COLORS.inkFaint, fontSize: 11 }} numberOfLines={1}>{enrollment.instructorName}</Text>
        <Progress pct={enrollment.progressPct} />
        <Text style={{ color: COLORS.inkFaint, fontSize: 11 }}>{enrollment.progressPct.toFixed(0)}% hoàn thành</Text>
      </View>
    </Pressable>
  );
}

function RowCard({ enrollment }: { enrollment: Enrollment }) {
  return (
    <Pressable onPress={() => open(enrollment)} style={{ flexDirection: 'row', borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.white }}>
      <View style={{ width: 110 }}>
        <Thumb url={enrollment.thumbnailUrl} height={86} />
      </View>
      <View style={{ flex: 1, padding: 10, gap: 5, justifyContent: 'center' }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.ink }} numberOfLines={2}>{enrollment.courseTitle}</Text>
        <Text style={{ color: COLORS.inkFaint, fontSize: 11 }} numberOfLines={1}>
          {enrollment.instructorName}{enrollment.lastAccessedAt ? ` · học ${formatRelative(enrollment.lastAccessedAt)}` : ''}
        </Text>
        <Progress pct={enrollment.progressPct} />
        <Text style={{ color: COLORS.inkFaint, fontSize: 11 }}>
          {enrollment.progressPct.toFixed(0)}% hoàn thành{enrollment.certificateCode ? ' · có chứng chỉ' : ''}
        </Text>
      </View>
    </Pressable>
  );
}
