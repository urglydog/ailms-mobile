import { useQuery } from '@tanstack/react-query';

import { CourseShelf } from '@/components/course/CourseShelf';
import { coursesApi } from '@/lib/api/courses';

/** "Khóa học liên quan": cùng danh mục (xếp theo đánh giá), bỏ khóa đang xem — port từ `fe/hooks/useRelatedCourses.ts`. */
export function RelatedCourses({ categorySlug, courseId }: { categorySlug: string; courseId: number }) {
  const { data } = useQuery({
    queryKey: ['courses', 'related', categorySlug, courseId],
    queryFn: async () => {
      const page = await coursesApi.search({ categorySlug, sortBy: 'rating' });
      return page.content.filter((c) => c.id !== courseId).slice(0, 9);
    },
    staleTime: 60_000,
  });
  return <CourseShelf title="Khóa học liên quan" courses={data ?? []} />;
}
