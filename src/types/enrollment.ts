// Khớp EnrollmentDto.Res phía BE (`be/src/main/java/com/lms/enrollment/dto/EnrollmentDto.java`).
export interface Enrollment {
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl: string | null;
  categoryName: string;
  isFree: boolean;
  price: number;
  alreadyReviewed: boolean;
  /** % bài COMPLETED / tổng bài READY. */
  progressPct: number;
  /** Chỉ có giá trị khi progressPct đạt 100. */
  completedAt: string | null;
  quizScore: number | null;
  /** "Học ngay" — bài học đầu tiên của khoá; null nếu khoá chưa có bài học nào. */
  firstLessonId: number | null;
  instructorName: string;
  myRating: number | null;
  enrolledAt: string;
  lastAccessedAt: string | null;
  /** Chỉ có giá trị khi đã hoàn thành 100% và chứng chỉ đã cấp. */
  certificateCode: string | null;
}
