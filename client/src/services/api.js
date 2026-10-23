import axios from 'axios';

function resolveBaseUrl() {
  let raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return '/api/v1';
  }
  raw = raw.trim().replace(/\/+$/, '');

  // If a full domain URL is passed (e.g. https://xxx.onrender.com)
  if (/^https?:\/\//i.test(raw)) {
    if (!raw.includes('/api')) {
      return `${raw}/api/v1`;
    }
    if (raw.endsWith('/api')) {
      return `${raw}/v1`;
    }
  }
  return raw;
}

const API_URL = resolveBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 25000, // 25 seconds timeout to avoid infinite hanging requests
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
