import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import StatusBadge from '../ui/StatusBadge';
import NextActionIndicator from '../ui/NextActionIndicator';

function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar user={user} />

      <div className="main-content">
        <Navbar user={user} />

        <div className="page-content">
          {/* Workflow Status Indicators */}
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