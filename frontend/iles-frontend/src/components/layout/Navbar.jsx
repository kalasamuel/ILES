import React from 'react';
import { useAuth } from '../../hooks/AuthContext';

function Navbar({ user }) {
  const { logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1>Dashboard</h1>
      </div>

      <div className="navbar-right">
        <div className="notifications">
          <button className="notification-btn">
            🔔
            <span className="notification-badge">3</span>
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