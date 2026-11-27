import type { Href } from 'expo-router';

import { materialsApi } from '@/lib/api/materials';
import { isOnlineNow } from '@/lib/network';

/** Đọc một tham số trong chuỗi truy vấn (`a=1&b=2`) mà không cần `URLSearchParams`. */
function queryParam(query: string, key: string): string | null {
  for (const pair of query.split('&')) {
    const [k, v] = pair.split('=');
    if (k === key) return decodeURIComponent(v ?? '');
  }
  return null;
}

/**
 * Đổi `linkUrl` của thông báo (đường dẫn của trang web, vd `/learn/12`, `/materials?courseId=3`) sang màn hình tương ứng
 * trong app. Không có `linkUrl` thì dựa vào loại thông báo. Trả về `null` nếu không có màn nào phù hợp (khi đó chỉ đánh dấu đã đọc).
 */
export function notificationHref(n: { type: string; linkUrl: string | null }): Href | null {
  if (n.linkUrl) {
    const link = n.linkUrl.replace(/^https?:\/\/[^/]+/i, '');
    const [path = '', query = ''] = link.split('?');

    const learn = path.match(/^\/learn\/(\d+)$/);
    if (learn) {
      const seek = queryParam(query, 'seek');
      return (seek ? `/lessons/${learn[1]}?seek=${encodeURIComponent(seek)}` : `/lessons/${learn[1]}`) as Href;
    }

    if (path === '/materials') {
      const courseId = queryParam(query, 'courseId');
      if (courseId && /^\d+$/.test(courseId)) return `/materials/${courseId}` as Href;
    }
    const material = path.match(/^\/materials\/(\d+)$/);
    if (material) return `/material/${material[1]}` as Href;

    const course = path.match(/^\/courses\/([^/]+)$/);
    if (course) return `/courses/${course[1]}` as Href;

    if (path === '/messages') {
      const conversationId = queryParam(query, 'conversationId');
      return (conversationId && /^\d+$/.test(conversationId) ? `/messages/${conversationId}` : '/messages') as Href;
    }

    if (path === '/disputes' || path === '/disputes/new') {
      const ref = queryParam(query, 'ref');
      return (ref ? `/disputes?ref=${encodeURIComponent(ref)}` : '/disputes') as Href;
    }

    const simple: Record<string, string> = {
      '/my-courses': '/my-courses',
      '/payments': '/payments',
      '/invoices': '/payments',
      '/wishlist': '/wishlist',
      '/certificates': '/certificates',
      '/community': '/community',
      '/live': '/live',
      '/cart': '/cart',
      '/profile': '/profile',
      '/notifications': '/notifications',
    };
    const mapped = simple[path];
    if (mapped) return mapped as Href;
  }

  switch (n.type) {
    case 'NEW_MESSAGE':
      return '/messages' as Href;
    case 'STREAK_REMINDER':
      return '/my-courses' as Href;
    case 'COURSE_COMPLETED':
      return '/certificates' as Href;
    case 'WISHLIST_PRICE_DROP':
      return '/wishlist' as Href;
    case 'DISPUTE_RESOLVED':
    case 'REFUND_TRANSFERRED':
    case 'REFUND_ACCOUNT_REQUIRED':
    case 'REFUND_ACCOUNT_UPDATED_SELF':
      return '/disputes' as Href;
    default:
      return null;
  }
}

/**
 * Như {@link notificationHref} nhưng thông minh hơn với nhắc ôn flashcard (`SRS_REMINDER`, link `/materials?courseId=N`): đi thẳng tới bộ flashcard
 * của khoá đó thay vì danh sách học liệu. Khoá có đúng một bộ thẻ → mở bộ thẻ; nhiều bộ → danh sách học liệu của khoá đã lọc sẵn theo Flashcard;
 * đang mất mạng → màn ôn tập offline.
 */
export async function resolveNotificationHref(n: { type: string; linkUrl: string | null }): Promise<Href | null> {
  const base = notificationHref(n);
  const courseId = n.type === 'SRS_REMINDER' && n.linkUrl ? n.linkUrl.match(/courseId=(\d+)/)?.[1] : undefined;
  if (!courseId) return base;
  if (!isOnlineNow()) return '/offline-flashcards' as Href;
  try {
    const [personal, shared] = await Promise.all([
      materialsApi.listForCourse(Number(courseId)).catch(() => []),
      materialsApi.listSharedForCourse(Number(courseId)).catch(() => []),
    ]);
    const decks = [...personal, ...shared].filter((m) => m.materialType === 'FLASHCARD' && m.status === 'COMPLETED');
    const only = decks.length === 1 ? decks[0] : undefined;
    if (only) return `/material/${only.id}` as Href;
    if (decks.length > 1) return `/materials/${courseId}?type=FLASHCARD` as Href;
  } catch {
    // Không tra được danh sách bộ thẻ — dùng đích mặc định.
  }
  return base;
}
