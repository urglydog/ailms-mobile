// Khớp AuthRequestDto.LoginReq / AuthResponseDto.TokenRes phía BE
// (`be/src/main/java/com/lms/auth/dto/AuthRequestDto.java` / `AuthResponseDto.java`).
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
