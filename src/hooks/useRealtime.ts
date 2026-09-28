'use client';

import { useEffect, useRef, useState } from 'react';
import { CrmEventPayload } from '@/lib/realtime';

export function useRealtime(onEvent?: (payload: CrmEventPayload) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      if (typeof window === 'undefined') return;

      const es = new EventSource('/api/realtime');
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (onEventRef.current) {
            onEventRef.current(payload);
          }
        } catch {
          // ignore heartbeats or non-json
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return { isConnected };
}
