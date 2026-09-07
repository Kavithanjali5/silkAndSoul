const API_BASE = window.API_BASE || `${location.origin}/api`;

function getToken() {
  return localStorage.getItem('ss_admin_token') || '';
}

function setSession(token, admin) {
  localStorage.setItem('ss_admin_token', token);
  localStorage.setItem('ss_admin_session', JSON.stringify(admin));
}

function clearSession() {
  localStorage.removeItem('ss_admin_token');
  localStorage.removeItem('ss_admin_session');
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('ss_admin_session') || 'null');
  } catch {
    return null;
  }
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const AuthAPI = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => api('/auth/me')
};

const ProductsAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/products${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/products/${id}`),
  create: (body) => api('/products', { method: 'POST', body }),
  update: (id, body) => api(`/products/${id}`, { method: 'PUT', body }),
  adjustStock: (id, delta) => api(`/products/${id}/stock`, { method: 'PATCH', body: { delta } }),
  remove: (id) => api(`/products/${id}`, { method: 'DELETE' })
};

const UsersAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/users${q ? `?${q}` : ''}`);
  },
  create: (body) => api('/users', { method: 'POST', body }),
  update: (id, body) => api(`/users/${id}`, { method: 'PUT', body }),
  setStatus: (id, status) => api(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id) => api(`/users/${id}`, { method: 'DELETE' })
};

const PaymentsAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/payments${q ? `?${q}` : ''}`);
  },
  create: (body) => api('/payments', { method: 'POST', body }),
  update: (id, body) => api(`/payments/${id}`, { method: 'PUT', body }),
  setStatus: (id, status) => api(`/payments/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id) => api(`/payments/${id}`, { method: 'DELETE' })
};

const AdminsAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api(`/admins${q ? `?${q}` : ''}`);
  },
  create: (body) => api('/admins', { method: 'POST', body }),
  update: (id, body) => api(`/admins/${id}`, { method: 'PUT', body }),
  remove: (id) => api(`/admins/${id}`, { method: 'DELETE' })
};

const DashboardAPI = {
  stats: () => api('/dashboard/stats'),
  activity: () => api('/dashboard/activity')
};

const MetaAPI = {
  categories: () => api('/meta/categories'),
  occasions: () => api('/meta/occasions')
};
