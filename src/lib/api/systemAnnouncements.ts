import { api } from '@/lib/api/client';
import type { SystemAnnouncementBanner } from '@/types/systemAnnouncement';

export const systemAnnouncementsApi = {
  getActiveBanner: () => api.get<SystemAnnouncementBanner | undefined>('/api/v1/system-announcements/banner'),
};
