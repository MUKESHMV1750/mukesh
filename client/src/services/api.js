import axios from 'axios';

function resolveBaseUrl() {
  let raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return '/api/v1';
  }
  raw = raw.trim().replace(/\/+$/, '');

  // If a full domain URL is passed (e.g. https://xxx.onrender.com)
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (typeof window !== 'undefined' && parsed.hostname === window.location.hostname) {
        return '/api/v1';
      }
    } catch (e) {}

    if (!raw.includes('/api')) {
      return `${raw}/api/v1`;
    }
    if (raw.endsWith('/api')) {
      return `${raw}/v1`;
    }
  }
  return raw;
}

export const API_BASE_URL = resolveBaseUrl();
const API_URL = API_BASE_URL;

/** Max file size aligned with server (350 MB) */
export const MAX_UPLOAD_BYTES = 350 * 1024 * 1024;

/**
 * Timeout for large transfers: 10 min base + 2s per MB, capped at 45 min
 */
export function transferTimeoutMs(bytes = 0) {
  const mb = Math.max(0, Number(bytes) || 0) / (1024 * 1024);
  return Math.min(45 * 60 * 1000, 10 * 60 * 1000 + Math.ceil(mb) * 2000);
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 60000, // default 60s for normal API calls (list/rename/etc.)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token from localStorage
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('drivex_admin_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['x-admin-token'] = token;
    }
  } catch (e) {
    // ignore localStorage restriction if any
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn('API request timed out:', error.config?.url);
    }
    if (error.response?.status === 401) {
      const reqUrl = error.config?.url || '';
      // Only clear and redirect when authenticated API calls fail with 401, not the login form itself
      if (!reqUrl.includes('/auth/login') && !reqUrl.includes('/share')) {
        try {
          localStorage.removeItem('drivex_admin_token');
        } catch (e) {}
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
