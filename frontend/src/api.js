const getApiBase = () => {
  if (window.location.port === '5173') {
    return 'http://localhost:5000/api';
  }
  return `${window.location.origin}/api`;
};

const API_BASE = import.meta.env.VITE_API_URL || getApiBase();


async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

// ---- Resources ----
export function fetchResources(search = '') {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return request(`/resources${params}`);
}

export function fetchResource(id) {
  return request(`/resources/${id}`);
}

export function createResource(data) {
  return request('/resources', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateResource(id, data) {
  return request(`/resources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteResource(id) {
  return request(`/resources/${id}`, { method: 'DELETE' });
}

// ---- Ping History ----
export function fetchPingHistory({ resourceId, limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (resourceId) params.set('resource_id', resourceId);
  params.set('limit', limit);
  params.set('offset', offset);
  return request(`/ping-history?${params.toString()}`);
}

export function fetchPingStats() {
  return request('/ping-history/stats');
}

// ---- Manual Ping ----
export function pingResource(id) {
  return request(`/resources/${id}/ping`, { method: 'POST' });
}

// ---- Test Connection ----
export function testConnection(data) {
  return request('/resources/test', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---- Scheduler Next Ping ----
export function fetchNextPing() {
  return request('/scheduler/next-ping');
}

// ---- Ping All Resources ----
export function pingAllResources() {
  return request('/scheduler/ping-all', { method: 'POST' });
}

