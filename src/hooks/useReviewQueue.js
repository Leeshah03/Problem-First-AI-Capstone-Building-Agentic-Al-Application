import { useState, useEffect, useCallback } from 'react';
import { fetchReviewQueue, reviewItem as apiReviewItem, batchReviewItems } from '../api/client.js';
import { DEMO_REVIEW_ITEMS } from '../data/demoData.js';

export function useReviewQueue(initialFilters = {}, orgId, eventStream) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingDemo, setUsingDemo] = useState(false);
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
      setUsingDemo(false);
    } catch {
      // Fall back to demo data
      let demo = [...DEMO_REVIEW_ITEMS];
      if (filters.status) demo = demo.filter(i => i.status === filters.status);
      if (filters.type) demo = demo.filter(i => i.reviewType === filters.type);
      if (filters.sort === 'confidence_asc') demo.sort((a, b) => a.aiConfidence - b.aiConfidence);
      else if (filters.sort === 'confidence_desc') demo.sort((a, b) => b.aiConfidence - a.aiConfidence);
      setItems(demo);
      setTotal(demo.length);
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }, [filters, orgId]);

  const handleReview = useCallback(async (id, action) => {
    if (usingDemo) {
      // Local-only demo mode: update item status in-place
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: action.action } : i));
      return;
    }
    try {
      await apiReviewItem(id, action);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }, [refresh, usingDemo]);

  const handleBatchReview = useCallback(async (ids, action) => {
    if (usingDemo) {
      const idSet = new Set(ids);
      setItems(prev => prev.map(i => idSet.has(i.id) ? { ...i, status: action } : i));
      return;
    }
    try {
      await batchReviewItems(ids, action);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }, [refresh, usingDemo]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh on new review items
  useEffect(() => {
    if (!eventStream) return;
    return eventStream.on('review:created', () => refresh());
  }, [eventStream, refresh]);

  return { items, total, loading, error, filters, setFilters, handleReview, handleBatchReview, refresh };
}
