import { api } from '@/lib/api/client';
import type { CartItem } from '@/types/cart';

export const cartApi = {
  list: () => api.get<CartItem[]>('/api/v1/cart'),
  add: (courseId: number) => api.post<CartItem>('/api/v1/cart/items', { courseId }),
  remove: (courseId: number) => api.delete<void>(`/api/v1/cart/items/${courseId}`),
};
