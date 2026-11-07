import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { CourseShelf } from '@/components/course/CourseShelf';
import { coursesApi, type CourseSearchParams } from '@/lib/api/courses';

const SHELVES: { key: string; title: string; params: CourseSearchParams }[] = [
  { key: 'trending', title: 'Đang thịnh hành', params: { sortBy: 'rating' } },
  { key: 'newest', title: 'Mới ra mắt', params: { sortBy: 'newest' } },
  { key: 'free', title: 'Miễn phí', params: { priceType: 'free', sortBy: 'reviews' } },
  { key: 'beginner', title: 'Dành cho người mới', params: { level: 'BEGINNER', priceType: 'paid', sortBy: 'rating' } },
];

function Shelf({ shelfKey, title, params }: { shelfKey: string; title: string; params: CourseSearchParams }) {
  const { data } = useQuery({
    queryKey: ['home-shelf', shelfKey],
    queryFn: async () => (await coursesApi.search(params)).content.slice(0, 9),
    staleTime: 60_000,
  });
  return <CourseShelf title={title} courses={data ?? []} />;
}

/** Các kệ trang chủ — port từ `fe/app/(public)/page.tsx` (thịnh hành / mới ra mắt / miễn phí / người mới). */
export function HomeShelves() {
  return (
    <View style={{ gap: 20, paddingHorizontal: 16, paddingTop: 12 }}>
      {SHELVES.map((s) => (
        <Shelf key={s.key} shelfKey={s.key} title={s.title} params={s.params} />
      ))}
    </View>
  );
}
