// Khớp CourseReviewDto phía BE (`be/src/main/java/com/lms/enrollment/dto/CourseReviewDto.java`).
export interface CourseReview {
  id: number;
  courseId: number;
  courseTitle: string;
  userName: string;
  userAvatarUrl: string | null;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  moderationReason: string | null;
  createdAt: string;
  moderationStatus: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment: string;
}
