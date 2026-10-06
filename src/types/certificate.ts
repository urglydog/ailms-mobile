// Khớp CertificateDto.Res phía BE (`be/src/main/java/com/lms/certificate/dto/CertificateDto.java`).
export type CertificateStatus = 'ISSUED' | 'REVOKED';

export interface Certificate {
  certificateCode: string;
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  studentName: string;
  courseHours: number;
  instructorName: string;
  completedAt: string;
  issuedAt: string;
  status: CertificateStatus;
  verifyUrl: string;
}
