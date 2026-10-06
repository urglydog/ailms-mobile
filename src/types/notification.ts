// Khớp NotificationDto.NotificationRes phía BE (`be/src/main/java/com/lms/common/dto/NotificationDto.java`).
export interface Notification {
  id: number;
  type: string;
  title: string;
  content: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}
