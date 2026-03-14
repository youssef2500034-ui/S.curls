const tokenKey = 'adminToken';
const API_BASE = (typeof window !== 'undefined' && window.location?.origin?.startsWith('file'))
  ? 'http://localhost:3001'
  : '';

function getToken() {
  try {
    return localStorage.getItem(tokenKey) || '';
  } catch (err) {
    return '';
  }
}

function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(tokenKey, token);
    } else {
      localStorage.removeItem(tokenKey);
    }
  } catch (err) {
    /* ignore */
  }
}

async function apiFetch(path, options = {}, { auth = false } = {}) {
  const opts = { ...options };
  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  opts.headers = { ...(options.headers || {}) };
  if (!isFormData) {
    opts.headers['Content-Type'] = 'application/json';
    if (opts.body && typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body);
    }
  }

  if (auth) {
    const token = getToken();
    if (token) opts.headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, opts);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const msg = body?.error || body?.message || res.statusText;
    const err = new Error(msg || 'Request failed');
    err.status = res.status;
    if (body && typeof body === 'object') {
      Object.assign(err, body);
    }
    throw err;
  }
  return body;
}

window.apiClient = {
  apiFetch,
  setToken,
  getToken,
  clearToken: () => setToken(''),
};
