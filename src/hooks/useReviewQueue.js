import { useState, useEffect, useCallback } from 'react';
import { fetchReviewQueue, reviewItem as apiReviewItem, batchReviewItems } from '../api/client.js';

export function useReviewQueue(initialFilters = {}, orgId, eventStream) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'pending',
    type: '',
    page: 1,
    limit: 50,
    sort: 'confidence_asc',
    ...initialFilters,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      params.page = String(filters.page);
      params.limit = String(filters.limit);
      params.sort = filters.sort;

      const data = await fetchReviewQueue(params);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, orgId]);

  const handleReview = useCallback(async (id, action) => {
    try {
      await apiReviewItem(id, action);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }, [refresh]);

  const handleBatchReview = useCallback(async (ids, action) => {
    try {
      await batchReviewItems(ids, action);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh on new review items
  useEffect(() => {
    if (!eventStream) return;
    return eventStream.on('review:created', () => refresh());
  }, [eventStream, refresh]);

  return { items, total, loading, error, filters, setFilters, handleReview, handleBatchReview, refresh };
}
