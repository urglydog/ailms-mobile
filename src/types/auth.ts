// Khớp AuthRequestDto / AuthResponseDto phía BE (`be/src/main/java/com/lms/auth/dto/`).
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

/** Luồng Google OAuth mobile — đổi mã dùng-1-lần (từ redirect `/oauth/google/mobile-callback`) lấy JWT thật. */
export interface GoogleMobileExchangeRequest {
  code: string;
}
