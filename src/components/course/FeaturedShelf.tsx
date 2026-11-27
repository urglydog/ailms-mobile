import { useQuery } from '@tanstack/react-query';

import { CourseShelf } from '@/components/course/CourseShelf';
import { coursesApi } from '@/lib/api/courses';

/**
 * Kệ "Được đề xuất" (khoá học đang trong đợt quảng bá đã được duyệt): ở đầu trang Khám phá, hoặc ở đầu danh sách khi đang lọc theo một chủ đề.
 * Lỗi hoặc rỗng thì không hiện gì, không ảnh hưởng phần còn lại của trang.
 */
export function FeaturedShelf({ categorySlug }: { categorySlug?: string }) {
  const { data } = useQuery({
    queryKey: ['featured-courses', categorySlug ?? 'home'],
    queryFn: () => coursesApi.featured(categorySlug ? 'CATEGORY_FEATURED' : 'HOME_FEATURED', categorySlug ? 4 : 8, categorySlug),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return <CourseShelf title="Được đề xuất" subtitle="Khoá học nổi bật được giảng viên quảng bá" courses={data ?? []} />;
}
