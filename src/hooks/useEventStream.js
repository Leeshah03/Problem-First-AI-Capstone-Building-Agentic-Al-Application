import { useState, useEffect, useRef, useCallback } from 'react';
import { getTokenFn } from '../api/client.js';

const EVENT_TYPES = [
  'sync:started', 'sync:completed', 'sync:failed',
  'pipeline:started', 'pipeline:progress', 'pipeline:completed',
  'signals:ingested', 'review:created',
];

export function useEventStream(orgId) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [activities, setActivities] = useState([]);
  const listenersRef = useRef(new Map());

  const on = useCallback((eventType, handler) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType).add(handler);
    return () => listenersRef.current.get(eventType)?.delete(handler);
  }, []);

  useEffect(() => {
    let es;

    async function connect() {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      let url = `${apiUrl}/events`;

      // EventSource doesn't support custom headers, so pass token as query param
      if (getTokenFn) {
        try {
          const token = await getTokenFn();
          if (token) url += `?token=${encodeURIComponent(token)}`;
        } catch { /* no token */ }
      }

      es = new EventSource(url);

      es.onopen = () => setConnected(true);
      es.onerror = () => setConnected(false);

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          setLastEvent(event);
          setActivities(prev => [event, ...prev].slice(0, 50));
        } catch { /* ignore */ }
      };

      for (const type of EVENT_TYPES) {
        es.addEventListener(type, (e) => {
          try {
            const data = JSON.parse(e.data);
            setLastEvent(data);
            setActivities(prev => [data, ...prev].slice(0, 50));

            const handlers = listenersRef.current.get(type);
            if (handlers) {
              for (const handler of handlers) handler(data);
            }
          } catch { /* ignore */ }
        });
      }
    }

    connect();

    return () => {
      if (es) es.close();
      setConnected(false);
    };
  }, [orgId]);

  return { connected, lastEvent, activities, on };
}
