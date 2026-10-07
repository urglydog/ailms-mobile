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

export interface MaterialDetail extends MaterialListItem {
  mermaidCode?: string;
  flashcards?: FlashcardCard[];
  /** Chỉ có khi materialType=QUIZ — ID Quiz thật, dùng để mở `/exam/{quizId}` (màn làm bài đã
   * có sẵn, tái dùng nguyên vẹn, không xây mới). */
  quizId?: number;
}

export interface FlashcardReviewResult {
  flashcardId: number;
  nextReviewAt: string;
  intervalDays: number;
  repetitions: number;
  easiness: number;
}
