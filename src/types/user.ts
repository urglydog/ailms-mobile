// Khớp UserDto.UserRes phía BE (`be/src/main/java/com/lms/auth/dto/UserDto.java`).
export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  role: UserRole;
  authProvider: string;
  preferredLanguage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  coursesPublic: boolean | null;
  wishlistPublic: boolean | null;
}

export interface UpdateMyProfileRequest {
  fullName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  preferredLanguage: string | null;
}

/** Khớp ActiveSession phía `fe/app/(public)/profile/page.tsx` (field từ `/users/me/sessions`). */
export interface ActiveSession {
  deviceName: string;
  ip: string;
  lastActiveAt: string;
}

export interface PublicCourseSummary {
  courseId: number;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  price: number;
  isFree: boolean;
  avgRating: number;
  reviewCount: number;
}

export interface PublicCertificate {
  certificateCode: string;
  courseTitle: string;
  studentName: string;
  courseHours: number;
  instructorName: string;
  completedAt: string;
  verifyUrl: string;
  courseCategoryName: string;
  issuedAt: string;
  status: 'ACTIVE' | 'REVOKED';
}

/** Khớp PublicProfile phía `fe/types/domain.ts` — `courses`/`wishlist` là `null` (khác mảng
 * rỗng) khi chủ tài khoản đã ẩn mục đó. */
export interface PublicProfile {
  id: number;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  role: UserRole;
  memberSince: string;
  courses: PublicCourseSummary[] | null;
  wishlist: PublicCourseSummary[] | null;
  certificates: PublicCertificate[];
}
