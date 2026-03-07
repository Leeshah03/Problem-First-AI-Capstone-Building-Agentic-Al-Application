const BASE = import.meta.env.VITE_API_URL || '/api';

let getTokenFn = null;

export function setAuthTokenProvider(fn) {
  getTokenFn = fn;
}

export { getTokenFn };

async function authFetch(url, options = {}) {
  const headers = { ...options.headers };
  if (getTokenFn) {
    try {
      const token = await getTokenFn();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch { /* no token available */ }
  }
  return fetch(url, { ...options, headers });
}

export async function fetchThemes() {
  const res = await authFetch(`${BASE}/themes`);
  if (!res.ok) throw new Error(`Failed to fetch themes: ${res.status}`);
  return res.json();
}

export async function fetchTheme(id) {
  const res = await authFetch(`${BASE}/themes/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch theme: ${res.status}`);
  return res.json();
}

export async function fetchStats() {
  const res = await authFetch(`${BASE}/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json();
}

// Review Queue
export async function fetchReviewQueue(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await authFetch(`${BASE}/review?${query}`);
  if (!res.ok) throw new Error(`Failed to fetch review queue: ${res.status}`);
  return res.json();
}

export async function reviewItem(id, action) {
  const res = await authFetch(`${BASE}/review/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });
  if (!res.ok) throw new Error(`Failed to review item: ${res.status}`);
  return res.json();
}

export async function batchReviewItems(ids, action) {
  const res = await authFetch(`${BASE}/review/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, action }),
  });
  if (!res.ok) throw new Error(`Failed to batch review: ${res.status}`);
  return res.json();
}

// Pipeline
export async function triggerPipeline(options = {}) {
  const res = await authFetch(`${BASE}/pipeline/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error(`Failed to trigger pipeline: ${res.status}`);
  return res.json();
}

export async function fetchPipelineStatus(id) {
  const res = await authFetch(`${BASE}/pipeline/status/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch pipeline status: ${res.status}`);
  return res.json();
}

export async function fetchPipelineRuns() {
  const res = await authFetch(`${BASE}/pipeline/runs`);
  if (!res.ok) throw new Error(`Failed to fetch pipeline runs: ${res.status}`);
  return res.json();
}

// Connectors
export async function fetchConnectors() {
  const res = await authFetch(`${BASE}/connectors`);
  if (!res.ok) throw new Error(`Failed to fetch connectors: ${res.status}`);
  return res.json();
}

export async function updateConnector(id, data) {
  const res = await authFetch(`${BASE}/connectors/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update connector: ${res.status}`);
  return res.json();
}

export async function triggerConnectorSync(id) {
  const res = await authFetch(`${BASE}/connectors/${id}/sync`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to trigger sync: ${res.status}`);
  return res.json();
}

// Activity Feed
export async function fetchActivity(limit = 20) {
  const res = await authFetch(`${BASE}/activity?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch activity: ${res.status}`);
  return res.json();
}
