import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiChevronDown } from 'react-icons/fi';
import { useAuth } from '../../hooks/AuthContext';
import { notificationsAPI } from '../../services/endpoints';
import { ROLES } from '../../constants';
import ilesLogo from '../../assets/iles_logo.png';
import './Navbar.css';

function Navbar({ user, onMenuClick }) {
  const { logout, userSettings } = useAuth();
  const navigate = useNavigate();
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
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U';
  const avatarUrl = user?.profile_picture_url || '';

  const normalizeRole = (rawRole) => {
    const normalized = String(rawRole || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    if (normalized === 'supervisor' || normalized === 'workplace') {
      return ROLES.WORKPLACE_SUPERVISOR;
    }
    if (normalized === 'academic') {
      return ROLES.ACADEMIC_SUPERVISOR;
    }
    return normalized;
  };

  const handleNotificationClick = () => {
    navigate('/app/notifications');
  };

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

        <div className="navbar-logo" aria-label="ILES">
          <img src={ilesLogo} alt="ILES logo" className="navbar-brand-image" />
        </div>
      </div>

      {/* Right — notifications + user menu */}
      <div className="navbar-right">

        {/* Notifications */}
        <div className="notifications">
          <button
            type="button"
            className="notification-btn"
            aria-label="Notifications"
            onClick={handleNotificationClick}
          >
            <FiBell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User menu */}
        <div className="user-menu" onClick={() => setProfileOpen(!profileOpen)}>
          <div className="user-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="user-avatar-image" />
            ) : (
              initials
            )}
          </div>
          <span>{user?.first_name} {user?.last_name}</span>
          <FiChevronDown size={14} color="#9a4f1c" />

          {/* Dropdown */}
          {profileOpen && (
            <>
              <div className="profile-backdrop" onClick={(e) => { e.stopPropagation(); setProfileOpen(false); }} />
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <p className="profile-dropdown-name">{user?.first_name} {user?.last_name}</p>
                  <p className="profile-dropdown-email">{userSettings?.show_email === false ? '' : user?.email}</p>
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