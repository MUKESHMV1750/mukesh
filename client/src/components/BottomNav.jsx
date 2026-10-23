import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { HardDrive, Clock, Star, Cloud, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function BottomNav() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Logged out successfully', 'info');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const navItems = [
    { to: '/', label: 'Drive', icon: HardDrive },
    { to: '/recent', label: 'Recent', icon: Clock },
    { to: '/starred', label: 'Starred', icon: Star },
    { to: '/storage', label: 'Storage', icon: Cloud },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="bottom-nav-container">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              title={item.label}
              aria-label={item.label}
            >
              <div className="bottom-nav-icon-wrap">
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
              </div>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          );
        })}

        {/* Dedicated mobile logout item */}
        <button
          type="button"
          onClick={handleLogout}
          className="bottom-nav-item bottom-nav-logout-btn"
          title="Logout from DriveX"
          aria-label="Logout"
        >
          <div className="bottom-nav-icon-wrap logout-icon-wrap">
            <LogOut size={20} strokeWidth={2.2} />
          </div>
          <span className="bottom-nav-label logout-label">Logout</span>
        </button>
      </div>
    </nav>
  );
}
