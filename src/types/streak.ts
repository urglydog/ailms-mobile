// Khớp StreakResponse phía BE (`be/src/main/java/com/lms/auth/dto/StreakResponse.java`).
export interface Streak {
  currentStreak: number;
  longestStreak: number;
  hasStudiedToday: boolean;
  learningDays: string[];
  freezesRemaining: number;
  justFrozen: boolean;
}
