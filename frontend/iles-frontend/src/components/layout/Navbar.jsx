import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/AuthContext';
import { notificationsAPI } from '../../services/endpoints';
import './Navbar.css';

function Navbar({ user, onMenuClick }) {
  const { logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        const response = await notificationsAPI.getNotifications();
        const notifications = response.results || response || [];
        setUnreadCount(notifications.filter((item) => !item.is_read).length);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };
    fetchUnreadNotifications();
  }, []);

  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U';

  return (
    <header className="navbar">

      {/* Left — hamburger + logo */}
      <div className="navbar-left">
        <button
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="navbar-logo">
          <div className="navbar-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5"/>
            </svg>
          </div>
          <span className="navbar-logo-text">ILES</span>
        </div>
      </div>

      {/* Right — notifications + user menu */}
      <div className="navbar-right">

        {/* Notifications */}
        <div className="notifications">
          <button className="notification-btn" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User menu */}
        <div className="user-menu" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setProfileOpen(!profileOpen)}>
          <div className="user-avatar">{initials}</div>
          <span>{user?.first_name} {user?.last_name}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a4f1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>

          {/* Dropdown */}
          {profileOpen && (
            <>
              <div className="profile-backdrop" onClick={(e) => { e.stopPropagation(); setProfileOpen(false); }} />
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <p className="profile-dropdown-name">{user?.first_name} {user?.last_name}</p>
                  <p className="profile-dropdown-email">{user?.email}</p>
                </div>
                <button
                  className="logout-btn"
                  onClick={(e) => { e.stopPropagation(); setProfileOpen(false); logout(); }}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}

export default Navbar;