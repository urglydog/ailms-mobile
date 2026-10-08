// Khớp LiveViewSummary/CourseBundle phía fe/types/domain.ts — chỉ port field cần cho banner/widget
// hiển thị ở trang chi tiết khoá học (mục #3 trong bảng ưu tiên UpComming_Plan.md).

export type LiveSessionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

export interface LiveViewSummary {
  id: number;
  title: string;
  status: LiveSessionStatus;
  scheduledAt: string | null;
  startedAt: string | null;
}

export interface BundleCourseItem {
  id: number;
  title: string;
  thumbnail: string | null;
  price: number;
}

export interface CourseBundle {
  id: number;
  title: string;
  description: string | null;
  discountPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  courses: BundleCourseItem[];
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}
