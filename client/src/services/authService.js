import api from './api';

export const authService = {
  login: (password) => api.post('/auth/login', { password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export default authService;
