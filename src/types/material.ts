// Khớp MaterialGenerationRes/MaterialDetailRes phía BE (`be/.../material/dto/`).
export type MaterialType = 'MINDMAP' | 'QUIZ' | 'FLASHCARD';
export type MaterialStatus = 'PENDING_TRANSCRIPT' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';

export interface MaterialListItem {
  id: number;
  materialType: MaterialType;
  language: string;
  title: string | null;
  versionNo: number;
  status: MaterialStatus;
  createdAt: string;
  /** Chỉ có giá trị khi materialType='QUIZ' — phân biệt NGAY ở danh sách giữa ôn tập thường
   * (LECTURE_QUIZ) và thi chính thức (OFFICIAL_EXAM), tránh nhầm như bug thật 07/10/2026 (2 loại
   * từng hiện label giống hệt nhau "Câu hỏi ôn tập", không cách nào phân biệt trước khi bấm vào). */
  quizType?: 'LECTURE_QUIZ' | 'OFFICIAL_EXAM' | null;
}

export interface FlashcardCard {
  id: number;
  frontText: string;
  backText: string;
  nextReviewAt: string;
  intervalDays: number;
  repetitions: number;
  easiness: number;
  isDue: boolean;
}

export interface QuizOption {
  id: number;
  content: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  content: string;
  displayOrder: number;
  options: QuizOption[];
}

export interface MaterialDetail extends MaterialListItem {
  mermaidCode?: string;
  flashcards?: FlashcardCard[];
  quizQuestions?: QuizQuestion[];
  /** 'LECTURE_QUIZ' = ôn tập thường (không giờ, làm tại chỗ) · 'OFFICIAL_EXAM' = thi chính thức
   * (có giờ/giám sát) — PHẢI rẽ nhánh theo field này, không phải cứ QUIZ là mở `/exam/{quizId}`
   * (bug thật 07/10/2026: mọi QUIZ material từng bị mở nhầm vào màn thi chính thức). */
  quizType?: 'LECTURE_QUIZ' | 'OFFICIAL_EXAM';
  /** Chỉ có khi materialType=QUIZ — ID Quiz thật, CHỈ dùng để mở `/exam/{quizId}` khi
   * quizType=OFFICIAL_EXAM. LECTURE_QUIZ làm trực tiếp từ `quizQuestions`, không cần field này. */
  quizId?: number;
}

/**
 * Mục trong "Kho Học Liệu Official" (`GET /api/v1/instructor/materials/courses/{courseId}`) —
 * khác `MaterialListItem` ("Lịch sử tạo cá nhân", chỉ học liệu CHÍNH học viên tự tạo): endpoint
 * này (dù path có chữ "instructor", học viên gọi được — `@PreAuthorize("isAuthenticated()")`)
 * trả về học liệu do giảng viên tạo + đánh dấu Official + đã gán (assign) vào bài học, nên mới
 * đúng là nơi hiện "Câu hỏi ôn tập"/"Sơ đồ tư duy"/"Flashcard" CHÍNH THỐNG của khoá học — bug
 * thật 07/10/2026: mobile ban đầu chỉ gọi `MaterialListItem`, bỏ sót hẳn danh sách này.
 */
export interface SharedMaterialListItem {
  id: number;
  materialType: MaterialType;
  title: string | null;
  status: MaterialStatus;
  isOfficial: boolean;
  quizType?: 'LECTURE_QUIZ' | 'OFFICIAL_EXAM' | null;
}

export interface FlashcardReviewResult {
  flashcardId: number;
  nextReviewAt: string;
  intervalDays: number;
  repetitions: number;
  easiness: number;
}
