import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/api/client';
import { resolveBaseUrl } from '@/lib/api/client';
import type { DubbingProgressEvent } from '@/types/dubbing';

export function useDubbingSocket(lessonId: number | null) {
  const [lastEvent, setLastEvent] = useState<DubbingProgressEvent | null>(null);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (lessonId == null) return;

    let isActive = true;

    getAccessToken().then((token) => {
      if (!isActive) return;

      const wsUrl = resolveBaseUrl().replace(/^http/, 'ws') + '/ws';
      const client = new Client({
        brokerURL: wsUrl,
        connectHeaders: {
          Authorization: `Bearer ${token ?? ''}`,
        },
        reconnectDelay: 3000,
      });

      client.onConnect = () => {
        client.subscribe(`/topic/dubbing/${lessonId}`, (message) => {
          try {
            setLastEvent(JSON.parse(message.body) as DubbingProgressEvent);
          } catch {
            // ignore JSON parse error
          }
        });
      };

      client.activate();
      clientRef.current = client;
    });

    return () => {
      isActive = false;
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [lessonId]);

  return { lastEvent };
}
