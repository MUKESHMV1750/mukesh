import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return Boolean(localStorage.getItem('drivex_admin_token'));
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const hasToken = (() => {
      try {
        return Boolean(localStorage.getItem('drivex_admin_token'));
      } catch {
        return false;
      }
    })();

    try {
      const res = await authService.getMe();
      if (res.data?.isAdmin === true) {
        setIsAuthenticated(true);
      } else if (!hasToken) {
        setIsAuthenticated(false);
      }
    } catch {
      // If backend is sleeping/starting up on Render, keep authenticated if token exists
      if (!hasToken) {
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(password) {
    const res = await authService.login(password);
    if (res.data && res.data.success) {
      const token = res.data.token || res.data.data?.token;
      if (token) {
        try {
          localStorage.setItem('drivex_admin_token', token);
        } catch (e) {}
      }
      setIsAuthenticated(true);
    }
    return res.data;
  }

  async function logout() {
    try {
      localStorage.removeItem('drivex_admin_token');
    } catch (e) {}
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
