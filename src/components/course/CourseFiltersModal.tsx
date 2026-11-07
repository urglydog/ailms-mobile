import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { CourseSortBy } from '@/lib/api/courses';
import { COLORS } from '@/lib/theme/colors';

export interface CourseFilterState {
  category: string | null;
  level: string | null;
  priceType: 'all' | 'free' | 'paid';
  minRating: number | null;
  durationBucket: string | null;
  sortBy: CourseSortBy;
}

export const EMPTY_FILTERS: CourseFilterState = {
  category: null,
  level: null,
  priceType: 'all',
  minRating: null,
  durationBucket: null,
  sortBy: 'newest',
};

const LEVELS: { value: string; label: string }[] = [
  { value: 'BEGINNER', label: 'Cơ bản' },
  { value: 'INTERMEDIATE', label: 'Trung cấp' },
  { value: 'ADVANCED', label: 'Nâng cao' },
];
const RATINGS = [4.5, 4.0, 3.5, 3.0];
const DURATIONS: { value: string; label: string }[] = [
  { value: '0-1', label: '0-1 giờ' },
  { value: '1-3', label: '1-3 giờ' },
  { value: '3-6', label: '3-6 giờ' },
  { value: '6-17', label: '6-17 giờ' },
  { value: '17+', label: 'Trên 17 giờ' },
];
const PRICES: { value: CourseFilterState['priceType']; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'free', label: 'Miễn phí' },
  { value: 'paid', label: 'Có phí' },
];
const SORTS: { value: CourseSortBy; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'relevance', label: 'Phù hợp nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'reviews', label: 'Nhiều đánh giá' },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: active ? COLORS.accent : COLORS.line, backgroundColor: active ? COLORS.accent : '#fff' }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : COLORS.inkMuted }}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: '700', color: COLORS.ink }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

/** Bộ lọc UC09 — port từ `fe/components/course/CourseFilters.tsx` (danh mục, đánh giá, thời lượng, học phí, trình độ, sắp xếp). */
export function CourseFiltersModal({
  visible,
  filters,
  categories,
  onChange,
  onClose,
}: {
  visible: boolean;
  filters: CourseFilterState;
  categories: { name: string; slug: string }[];
  onChange: (next: CourseFilterState) => void;
  onClose: () => void;
}) {
  const toggle = <K extends keyof CourseFilterState>(key: K, value: CourseFilterState[K]) =>
    onChange({ ...filters, [key]: filters[key] === value ? EMPTY_FILTERS[key] : value });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.ink }}>Bộ lọc</Text>
          <Pressable onPress={() => onChange(EMPTY_FILTERS)}>
            <Text style={{ color: COLORS.accent, fontWeight: '600' }}>Xóa bộ lọc</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
          <Section title="Sắp xếp">
            {SORTS.map((s) => (
              <Chip key={s.value} label={s.label} active={filters.sortBy === s.value} onPress={() => onChange({ ...filters, sortBy: s.value })} />
            ))}
          </Section>
          <Section title="Danh mục">
            {categories.map((c) => (
              <Chip key={c.slug} label={c.name} active={filters.category === c.slug} onPress={() => toggle('category', c.slug)} />
            ))}
          </Section>
          <Section title="Đánh giá">
            {RATINGS.map((r) => (
              <Chip key={r} label={`${r.toFixed(1)} sao trở lên`} active={filters.minRating === r} onPress={() => toggle('minRating', r)} />
            ))}
          </Section>
          <Section title="Thời lượng video">
            {DURATIONS.map((d) => (
              <Chip key={d.value} label={d.label} active={filters.durationBucket === d.value} onPress={() => toggle('durationBucket', d.value)} />
            ))}
          </Section>
          <Section title="Học phí">
            {PRICES.map((p) => (
              <Chip key={p.value} label={p.label} active={filters.priceType === p.value} onPress={() => onChange({ ...filters, priceType: p.value })} />
            ))}
          </Section>
          <Section title="Trình độ">
            {LEVELS.map((l) => (
              <Chip key={l.value} label={l.label} active={filters.level === l.value} onPress={() => toggle('level', l.value)} />
            ))}
          </Section>
        </ScrollView>
        <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.lineSoft }}>
          <Pressable onPress={onClose} style={{ backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Xem kết quả</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
