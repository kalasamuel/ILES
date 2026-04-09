import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import StatusBadge from '../ui/StatusBadge';
import NextActionIndicator from '../ui/NextActionIndicator';
import './AppLayout.css';

function AppLayout() {
  const { user } = useAuth();
  // Start closed on all screen sizes — hamburger opens it
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Overlay — closes sidebar when clicking outside it */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        <Navbar
          user={user}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
        />

        <div className="page-content">
          <div className="workflow-indicators">
            <StatusBadge status="submitted" />
            <NextActionIndicator action="Supervisor Review" />
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AppLayout;