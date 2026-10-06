// Khớp WishlistDto.ItemRes phía BE (`be/src/main/java/com/lms/wishlist/dto/WishlistDto.java`).
export interface WishlistItem {
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl: string | null;
  instructorName: string;
  price: number;
  isFree: boolean;
  avgRating: number | null;
  reviewCount: number;
  addedAt: string;
  finalPrice: number;
  discountPercent: number | null;
}
