import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RecentFiles from './pages/RecentFiles';
import StarredFiles from './pages/StarredFiles';
import TrashPage from './pages/TrashPage';
import StoragePage from './pages/StoragePage';
import SharedDownload from './pages/SharedDownload';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {/* Global Ambient Organic Corner Accents (DriveX Theme Identity) */}
          <div className="corner-blob-tl" aria-hidden="true" />
          <div className="corner-blob-tr" aria-hidden="true" />
          <div className="corner-blob-bl" aria-hidden="true" />
          <div className="corner-blob-br" aria-hidden="true" />

          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/share/:token" element={<SharedDownload />} />

            {/* Protected Admin Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recent"
              element={
                <ProtectedRoute>
                  <RecentFiles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/starred"
              element={
                <ProtectedRoute>
                  <StarredFiles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trash"
              element={
                <ProtectedRoute>
                  <TrashPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/storage"
              element={
                <ProtectedRoute>
                  <StoragePage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
