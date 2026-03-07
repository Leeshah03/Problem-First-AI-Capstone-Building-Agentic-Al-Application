import { useState, useEffect, useCallback } from 'react';
import { fetchThemes } from '../api/client.js';
import { DEMO_THEMES } from '../data/demoData.js';

export function useThemes(orgId, eventStream) {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchThemes()
      .then(data => { setThemes(data); setError(null); setLoading(false); })
      .catch(() => { setError(null); setThemes(DEMO_THEMES); setLoading(false); });
  }, []);

  useEffect(() => { refresh(); }, [orgId, refresh]);

  // Auto-refresh on pipeline completion
  useEffect(() => {
    if (!eventStream) return;
    return eventStream.on('pipeline:completed', () => refresh());
  }, [eventStream, refresh]);

  return { themes, loading, error, setThemes, refresh };
}
