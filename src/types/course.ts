// Khớp CoursePublicDto.SummaryRes phía BE
// (`be/src/main/java/com/lms/catalog/dto/CoursePublicDto.java`).
export interface CourseSummary {
  id: number;
  title: string;
  slug: string;
  instructorName: string;
  thumbnailUrl: string | null;
  level: string;
  price: number;
  isFree: boolean;
  avgRating: number | null;
  reviewCount: number;
  totalLessons: number;
  totalDurationSec: number;
  categorySlug: string;
  categoryName: string;
  finalPrice: number;
  /** null nếu không có coupon áp dụng được */
  discountPercent: number | null;
}

/** Trang dữ liệu — khớp Page<T> của Spring Data. */
export interface Page<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
