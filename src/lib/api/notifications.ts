import { api } from '@/lib/api/client';
import type { Notification } from '@/types/notification';

export const notificationsApi = {
  getAll(): Promise<Notification[]> {
    return api.get<Notification[]>('/api/v1/notifications');
  },

  markAsRead(id: number): Promise<void> {
    return api.patch<void>(`/api/v1/notifications/${id}/read`);
  },

  markAllAsRead(): Promise<void> {
    return api.patch<void>('/api/v1/notifications/read-all');
  },
};
