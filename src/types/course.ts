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

/** Khớp CoursePublicDto.LessonRes — bài học nhẹ, nằm lồng trong course detail (không có endpoint riêng). */
export interface CourseLessonSummary {
  id: number;
  title: string;
  displayOrder: number;
  isPreview: boolean;
  durationSec: number;
}

/** Khớp CoursePublicDto.ChapterRes. */
export interface CourseChapter {
  id: number;
  title: string;
  displayOrder: number;
  lessons: CourseLessonSummary[];
}

/** Khớp CoursePublicDto.DetailRes — GET /api/v1/courses/{slug} (lấy theo slug, không phải id). */
export interface CourseDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  instructorName: string;
  thumbnailUrl: string | null;
  level: string;
  price: number;
  isFree: boolean;
  avgRating: number | null;
  reviewCount: number;
  totalDurationSec: number;
  categorySlug: string;
  categoryName: string;
  chapters: CourseChapter[];
  updatedAt: string;
  sourceLanguage: string | null;
  dubbedLanguages: string[];
  learnerCount: number;
  finalPrice: number;
  discountPercent: number | null;
  /** Khoá học riêng tư cần mật khẩu mới ghi danh được. */
  requiresPassword: boolean;
}

/** Trang dữ liệu — khớp Page<T> của Spring Data. */
export interface Page<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
