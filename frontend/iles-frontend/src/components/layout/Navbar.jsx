import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/AuthContext';
import { notificationsAPI } from '../../services/endpoints';

function Navbar({ user }) {
  const { logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1>Dashboard</h1>
      </div>

      <div className="navbar-right">
        <div className="notifications">
          <button className="notification-btn">
            🔔
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
        </div>

        <div className="user-menu">
          <span>Welcome, {user?.first_name}</span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;