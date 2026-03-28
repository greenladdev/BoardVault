const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error ?? `Request failed: ${res.status}`);
    err.debug = data.debug;
    throw err;
  }
  return data;
}

export const api = {
  games: {
    list: () => request('/games'),
    add: (bggId) => request('/games', { method: 'POST', body: JSON.stringify({ bggId }) }),
    delete: (id) => request(`/games/${id}`, { method: 'DELETE' }),
    pick: (params) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
      return request(`/games/pick?${qs}`);
    },
  },
  bgg: {
    status: () => request('/bgg/status'),
    login: (username, password) =>
      request('/bgg/auth', { method: 'POST', body: JSON.stringify({ username, password }) }),
    logout: () => request('/bgg/auth', { method: 'DELETE' }),
    search: (q) => request(`/bgg/search?q=${encodeURIComponent(q)}`),
    details: (id) => request(`/bgg/details/${id}`),
  },
};
