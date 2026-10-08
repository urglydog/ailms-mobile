export interface CartItem {
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl: string | null;
  instructorName: string;
  price: number;
  addedAt: string;
  avgRating: number;
  reviewCount: number;
  totalDurationSec: number;
  totalLessons: number;
  level: string;
  finalPrice: number;
  discountPercent: number | null;
}
