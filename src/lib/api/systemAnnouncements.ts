import { api } from '@/lib/api/client';
import type { SystemAnnouncementBanner } from '@/types/systemAnnouncement';

export const systemAnnouncementsApi = {
  /** BE trả 204 (không có nội dung) khi chưa có thông báo nào — chuyển thành `null` vì React Query không chấp nhận kết quả `undefined`. */
  getActiveBanner: async (): Promise<SystemAnnouncementBanner | null> =>
    (await api.get<SystemAnnouncementBanner | undefined>('/api/v1/system-announcements/banner')) ?? null,
};
