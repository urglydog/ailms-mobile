import type { Enrollment } from '@/types/enrollment';

/** Logic lọc/sắp xếp "Khoá học của tôi" — cổng từ `fe/lib/myCourses/model.ts` (làm phía client). */
export type CourseStatus = 'in-progress' | 'completed';
export type StatusFilter = 'all' | CourseStatus;
export type SortOption = 'recently-accessed' | 'recently-enrolled' | 'title-asc' | 'title-desc';

export function statusOf(c: Enrollment): CourseStatus {
  return c.progressPct >= 100 ? 'completed' : 'in-progress';
}

export function countByStatus(courses: Enrollment[]): Record<StatusFilter, number> {
  const completed = courses.filter((c) => statusOf(c) === 'completed').length;
  return { all: courses.length, 'in-progress': courses.length - completed, completed };
}

function time(v: string | null | undefined): number {
  return v ? new Date(v).getTime() : 0;
}

export function filterAndSort(courses: Enrollment[], q: { status: StatusFilter; query: string; sort: SortOption }): Enrollment[] {
  const needle = q.query.trim().toLowerCase();
  const filtered = courses.filter((c) => {
    if (q.status !== 'all' && statusOf(c) !== q.status) return false;
    if (needle && !c.courseTitle.toLowerCase().includes(needle)) return false;
    return true;
  });
  return [...filtered].sort((a, b) => {
    switch (q.sort) {
      case 'recently-accessed':
        return time(b.lastAccessedAt) - time(a.lastAccessedAt);
      case 'recently-enrolled':
        return time(b.enrolledAt) - time(a.enrolledAt);
      case 'title-asc':
        return a.courseTitle.localeCompare(b.courseTitle);
      case 'title-desc':
        return b.courseTitle.localeCompare(a.courseTitle);
    }
  });
}

/** Khoá đang học dở gần nhất (chưa học bài nào thì theo ngày ghi danh). */
export function pickContinue(courses: Enrollment[]): Enrollment | null {
  const inProgress = courses.filter((c) => statusOf(c) === 'in-progress');
  if (inProgress.length === 0) return null;
  const touched = (c: Enrollment) => time(c.lastAccessedAt) || time(c.enrolledAt);
  return [...inProgress].sort((a, b) => touched(b) - touched(a))[0] ?? null;
}

/** Khoá hoàn thành gần nhất — cho khối chúc mừng khi không còn khoá đang học. */
export function pickCompleted(courses: Enrollment[]): Enrollment | null {
  const done = courses.filter((c) => statusOf(c) === 'completed');
  if (done.length === 0) return null;
  return [...done].sort((a, b) => time(b.completedAt) - time(a.completedAt))[0] ?? null;
}

export function lessonTarget(c: Enrollment): string {
  const lessonId = c.resumeLessonId ?? c.firstLessonId;
  return lessonId != null ? `/lessons/${lessonId}` : `/courses/${c.courseSlug}`;
}

export function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}
