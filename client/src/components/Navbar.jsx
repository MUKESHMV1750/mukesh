import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Search, Upload, HardDrive,
  LogOut, X, Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DriveXLogo from './DriveXLogo';

export default function Navbar({
  onToggleSidebar,
  onSearch,
  searchQuery = '',
  onUploadClick,
}) {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const profileRef = useRef(null);
  const mobileInputRef = useRef(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalQuery(val);
    if (onSearch) onSearch(val);
  };

  const handleClearSearch = () => {
    setLocalQuery('');
    if (onSearch) onSearch('');
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await logout();
      showToast('Logged out successfully', 'info');
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          <button
            className="navbar-hamburger"
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation Menu"
          >
            <Menu size={22} />
          </button>

          <DriveXLogo size="sm" onClick={() => navigate('/')} />
        </div>

        {/* Desktop Search Bar */}
        <div className="navbar-search">
          <div className="search-container">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search in Drive..."
              value={localQuery}
              onChange={handleSearchChange}
              aria-label="Search files and folders"
            />
            {localQuery && (
              <button
                type="button"
                className="btn-ghost"
                onClick={handleClearSearch}
                style={{ padding: '4px' }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="navbar-right">
          {/* Mobile Search Toggle Button */}
          {onSearch && (
            <button
              type="button"
              className={`navbar-icon-btn navbar-mobile-search-btn ${mobileSearchOpen ? 'active' : ''}`}
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label="Toggle mobile search"
              title="Search files"
            >
              {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
          )}

          {onUploadClick && (
            <button
              type="button"
              className="navbar-upload-btn"
              onClick={onUploadClick}
              title="Upload Files"
              aria-label="Upload Files"
            >
              <Upload size={18} />
              <span>Upload</span>
            </button>
          )}

          <div className="profile-wrapper" ref={profileRef} style={{ position: 'relative' }}>
            <div
              className="admin-profile"
              onClick={() => setProfileOpen(!profileOpen)}
              role="button"
              tabIndex={0}
              aria-label="Admin Profile Menu"
            >
              <div className="admin-avatar">A</div>
              <span className="admin-name">Administrator</span>
            </div>

            {profileOpen && (
              <div className="admin-dropdown">
                <div className="admin-dropdown-header">
                  <div className="admin-avatar sm">A</div>
                  <div className="admin-dropdown-meta">
                    <span className="admin-dropdown-name">Administrator</span>
                    <span className="admin-dropdown-badge">Admin Session</span>
                  </div>
                </div>
                <div className="sidebar-divider" style={{ margin: '6px 0' }} />
                <button
                  type="button"
                  className="admin-dropdown-item"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/storage');
                  }}
                >
                  <HardDrive size={16} />
                  <span>Storage Overview</span>
                </button>
                <div className="sidebar-divider" style={{ margin: '6px 0' }} />
                <button
                  type="button"
                  className="admin-dropdown-item danger logout-item"
                  onClick={handleLogout}
                  title="Logout from DriveX"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Expandable Mobile Search Dropdown Bar */}
      {mobileSearchOpen && (
        <div className="navbar-mobile-search-bar animate-fade-in">
          <div className="mobile-search-container">
            <Search size={18} className="search-icon" />
            <input
              ref={mobileInputRef}
              type="text"
              placeholder="Search files and folders..."
              value={localQuery}
              onChange={handleSearchChange}
              aria-label="Search in Drive"
            />
            {localQuery && (
              <button
                type="button"
                className="btn-ghost"
                onClick={handleClearSearch}
                aria-label="Clear query"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary mobile-search-close-btn"
              onClick={() => {
                setMobileSearchOpen(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
