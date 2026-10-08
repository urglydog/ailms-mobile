import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';

import { getAccessToken, resolveBaseUrl } from '@/lib/api/client';
import { lessonChatApi } from '@/lib/api/communication';
import type { LessonChatMessage } from '@/types/lessonPlayer';

/**
 * Port từ `fe/hooks/useCommunitySocket.ts` — Hỏi đáp realtime dưới mỗi bài học.
 *
 * Backend bật STOMP qua endpoint SockJS (`WebSocketConfig.registerStompEndpoints` dùng
 * `.withSockJS()`) — nhưng SockJS JS client (dùng ở web) dựa vào API trình duyệt (XHR
 * streaming/polling) không có trên React Native. Spring's SockJS endpoint vẫn chấp nhận
 * WebSocket THUẦN kết nối thẳng vào sub-path `/websocket` (bỏ qua lớp đàm phán SockJS) — RN có
 * sẵn `WebSocket` toàn cục nên dùng `brokerURL` (không phải `webSocketFactory`) trỏ thẳng vào đó.
 */
export function useLessonChat(lessonId: number | null) {
  const [messages, setMessages] = useState<LessonChatMessage[]>([]);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (lessonId == null) return;

    let cancelled = false;
    lessonChatApi.getHistory(lessonId).then((history) => {
      if (!cancelled) setMessages(history);
    }).catch(() => {
      // Lịch sử chat lỗi không nghiêm trọng — vẫn kết nối WS để nhận tin mới.
    });

    let client: Client | null = null;
    (async () => {
      const token = await getAccessToken();
      const wsUrl = resolveBaseUrl().replace(/^http/, 'ws') + '/ws/websocket';

      client = new Client({
        brokerURL: wsUrl,
        connectHeaders: { Authorization: `Bearer ${token ?? ''}` },
        reconnectDelay: 3000,
      });

      client.onConnect = () => {
        client?.subscribe(`/topic/lesson/${lessonId}/chat`, (message) => {
          try {
            const msg = JSON.parse(message.body) as LessonChatMessage;
            setMessages((prev) => [...prev, msg]);
          } catch {
            // Ignore invalid messages
          }
        });
      };

      client.activate();
      clientRef.current = client;
    })();

    return () => {
      cancelled = true;
      client?.deactivate();
      clientRef.current = null;
    };
  }, [lessonId]);

  const sendMessage = (content: string, senderId: string, senderName: string, parentId?: string) => {
    if (!content.trim() || !clientRef.current?.connected || lessonId == null) return;
    const payload: Record<string, string> = { senderId, senderName, content };
    if (parentId) payload.parentId = parentId;
    clientRef.current.publish({
      destination: `/app/chat/${lessonId}`,
      body: JSON.stringify(payload),
    });
  };

  return { messages, sendMessage };
}
