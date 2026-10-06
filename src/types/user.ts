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
