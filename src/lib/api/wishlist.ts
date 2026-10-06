import { api } from '@/lib/api/client';
import type { WishlistItem } from '@/types/wishlist';

export const wishlistApi = {
  getMine(): Promise<WishlistItem[]> {
    return api.get<WishlistItem[]>('/api/v1/wishlist');
  },

  addItem(courseId: number): Promise<WishlistItem> {
    return api.post<WishlistItem>('/api/v1/wishlist/items', { courseId });
  },

  removeItem(courseId: number): Promise<void> {
    return api.delete<void>(`/api/v1/wishlist/items/${courseId}`);
  },
};
