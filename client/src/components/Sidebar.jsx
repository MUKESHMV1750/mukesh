import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HardDrive,
  Clock,
  Star,
  Trash2,
  Cloud,
  FolderPlus,
  UploadCloud,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import fileService from '../services/fileService';
import { formatFileSize } from '../utils/formatFileSize';
import DriveXLogo from './DriveXLogo';

export default function Sidebar({
  isOpen,
  onClose,
  onCreateFolder,
  onUploadClick,
  storageInfo,
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const location = useLocation();
  const [internalStorage, setInternalStorage] = useState(storageInfo || null);

  const handleLogout = async () => {
    onClose?.();
    try {
      await logout();
      showToast('Logged out successfully', 'info');
    } finally {
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    if (storageInfo) {
      setInternalStorage(storageInfo);
    } else {
      fetchStorage();
    }
  }, [storageInfo, location.pathname]);

  const fetchStorage = async () => {
    try {
      const res = await fileService.getStorageUsage();
      if (res.data?.success) {
        setInternalStorage(res.data.data);
      }
    } catch {
      // storage info endpoint failure is non-fatal
    }
  };

  // Nav items aligned with DriveX 4 index colors
  const navItems = [
    { to: '/', label: 'My Drive', icon: HardDrive, colorClass: 'nav-icon-blue' },
    { to: '/recent', label: 'Recent', icon: Clock, colorClass: 'nav-icon-green' },
    { to: '/starred', label: 'Starred', icon: Star, colorClass: 'nav-icon-yellow' },
    { to: '/trash', label: 'Trash', icon: Trash2, colorClass: 'nav-icon-red' },
    { to: '/storage', label: 'Storage', icon: Cloud, colorClass: 'nav-icon-indigo' },
  ];

  // Storage calculation
  const usageBytes = Number(internalStorage?.usageInDrive || internalStorage?.usage || 0);
  const limitBytes = Number(internalStorage?.limit || 16106127360); // 15 GB default
  const percentUsed = limitBytes > 0 ? Math.min(100, Math.round((usageBytes / limitBytes) * 100)) : 0;

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Mobile Sidebar Header */}
        <div className="sidebar-mobile-header">
          <DriveXLogo
            size="sm"
            onClick={() => {
              onClose?.();
              navigate('/');
            }}
          />
          <button
            type="button"
            className="btn-ghost sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {(onCreateFolder || onUploadClick) && (
          <div className="sidebar-actions-wrap" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {onCreateFolder && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onClose?.();
                  onCreateFolder();
                }}
                style={{ flex: 1, padding: '9px 12px', fontSize: '0.8125rem' }}
              >
                <FolderPlus size={16} />
                <span>New Folder</span>
              </button>
            )}
            {onUploadClick && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose?.();
                  onUploadClick();
                }}
                style={{ flex: 1, padding: '9px 12px', fontSize: '0.8125rem' }}
              >
                <UploadCloud size={16} />
                <span>Upload</span>
              </button>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <div className={`sidebar-item-icon ${item.colorClass}`}>
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                </div>
                <span className="sidebar-item-label">{item.label}</span>
                {isActive && <div className="sidebar-item-indicator" />}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-divider" />

        {/* Upgraded Storage Card aligned with Index Theme */}
        <div className="sidebar-storage">
          <div className="storage-card-inner">
            <div className="storage-card-header">
              <div className="storage-card-icon">
                <Cloud size={18} />
              </div>
              <div className="storage-card-title-group">
                <span className="storage-card-title">Drive Storage</span>
                <span className="storage-card-badge">{percentUsed}% used</span>
              </div>
            </div>

            <div className="storage-bar-bg">
              <div
                className="storage-bar-fill"
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            <div className="storage-text">
              <strong>{formatFileSize(usageBytes)}</strong> of <span>{formatFileSize(limitBytes)}</span>
            </div>

            <NavLink to="/storage" className="storage-manage-btn" onClick={onClose}>
              <span>Storage Overview</span>
              <ChevronRight size={14} />
            </NavLink>
          </div>
        </div>

        {/* Mobile Admin Profile & Logout Section */}
        <div className="sidebar-mobile-footer">
          <div className="sidebar-divider" style={{ margin: '8px 0 12px 0' }} />
          <div className="sidebar-profile-card">
            <div className="admin-avatar">A</div>
            <div className="sidebar-profile-meta">
              <span className="sidebar-profile-name">Administrator</span>
              <span className="sidebar-profile-badge">Admin Session</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Logout from DriveX"
            aria-label="Logout"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
