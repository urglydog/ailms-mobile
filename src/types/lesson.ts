// Khớp LessonPlayerDto.Res phía BE (`be/src/main/java/com/lms/enrollment/dto/LessonPlayerDto.java`)
// — GET /api/v1/lessons/{lessonId}/player (yêu cầu JWT).

export interface SubtitleSegment {
  startSec: number;
  endSec: number;
  text: string;
}

export interface AudioChunk {
  index: number;
  url: string;
}

export interface AudioTrack {
  id: number;
  language: string;
  status: string;
  finalUrl: string | null;
  durationSec: number;
  chunks: AudioChunk[];
}

export interface LessonLanguage {
  code: string;
  label: string;
  available: boolean;
  track: AudioTrack | null;
  subtitles: SubtitleSegment[];
}

export interface LessonNav {
  lessonId: number;
  lessonTitle: string;
  displayOrder: number;
  durationSec: number;
  isPreview: boolean;
  isCompleted: boolean;
}

export interface ChapterNav {
  chapterId: number;
  chapterTitle: string;
  displayOrder: number;
  lessons: LessonNav[];
}

export interface LessonPlayer {
  lessonId: number;
  lessonTitle: string;
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  videoSource: string;
  videoUrl: string;
  youtubeId: string | null;
  durationSec: number;
  sourceLanguage: string;
  isPreview: boolean;
  /** true nếu học viên đã ghi danh khoá này (khác isPreview — bài xem thử không cần ghi danh). */
  enrolled: boolean;
  /** Vị trí xem dở lần trước (giây) — dùng để tiếp tục phát từ đó. */
  lastPositionSec: number;
  languages: LessonLanguage[];
  chapters: ChapterNav[];
  originalSubtitles: SubtitleSegment[];
}

/** Khớp LessonProgressDto.Res — POST /api/v1/lessons/{lessonId}/progress. */
export interface LessonProgress {
  watchedSec: number;
  lastPositionSec: number;
  isCompleted: boolean;
}
