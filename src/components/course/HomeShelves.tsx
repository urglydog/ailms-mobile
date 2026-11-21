import { useQuery } from '@tanstack/react-query';
import type { Href } from 'expo-router';

import { CourseShelf } from '@/components/course/CourseShelf';
import { coursesApi, type CourseSearchParams } from '@/lib/api/courses';

export type ShelfDef = { key: string; title: string; subtitle?: string; params: CourseSearchParams };

export const SHELVES: Record<'trending' | 'newest' | 'free' | 'beginner', ShelfDef> = {
  trending: { key: 'trending', title: 'Đang thịnh hành', subtitle: 'Được học viên đánh giá cao nhất', params: { sortBy: 'rating' } },
  newest: { key: 'newest', title: 'Mới ra mắt', params: { sortBy: 'newest' } },
  free: { key: 'free', title: 'Học miễn phí', subtitle: 'Bắt đầu mà không tốn đồng nào', params: { priceType: 'free', sortBy: 'reviews' } },
  beginner: { key: 'beginner', title: 'Dành cho người mới', params: { level: 'BEGINNER', priceType: 'paid', sortBy: 'rating' } },
};

/** Đường dẫn "Xem tất cả" — mở màn Tìm kiếm với đúng bộ lọc của kệ. */
function seeAllHref(def: ShelfDef): Href {
  const q = new URLSearchParams({ title: def.title });
  if (def.params.sortBy) q.set('sort', def.params.sortBy);
  if (def.params.priceType) q.set('price', def.params.priceType);
  if (def.params.level) q.set('level', def.params.level);
  return `/search?${q.toString()}` as Href;
}

/** Một kệ trên trang Khám phá (tải 10 khoá, cuộn ngang, có "Xem tất cả"). */
export function HomeShelf({ def }: { def: ShelfDef }) {
  const { data } = useQuery({
    queryKey: ['home-shelf', def.key],
    queryFn: async () => (await coursesApi.search(def.params)).content.slice(0, 10),
    staleTime: 60_000,
  });
  return <CourseShelf title={def.title} subtitle={def.subtitle} courses={data ?? []} seeAllHref={seeAllHref(def)} />;
}
