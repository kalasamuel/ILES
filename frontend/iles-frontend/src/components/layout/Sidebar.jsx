import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiAward,
  FiBarChart2,
  FiBriefcase,
  FiBell,
  FiCheckSquare,
  FiFileText,
  FiGrid,
  FiSearch,
  FiSettings,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { ROLES } from '../../constants';
import './Sidebar.css';

function normalizeRole(rawRole) {
  const normalized = String(rawRole || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'workplace' || normalized === 'supervisor') {
    return ROLES.WORKPLACE_SUPERVISOR;
  }
  if (normalized === 'academic') {
    return ROLES.ACADEMIC_SUPERVISOR;
  }
  return normalized;
}

function getSidebarItems(role) {
  const items = {
    [ROLES.STUDENT]: [
      { path: '/app/dashboard', label: 'Dashboard',   Icon: FiGrid },
      { path: '/app/placements', label: 'Placements',  Icon: FiBriefcase },
      { path: '/app/placements/create', label: 'Submit Placement', Icon: FiFileText },
      { path: '/app/logs',       label: 'My Logs',     Icon: FiFileText },
      { path: '/app/reports',    label: 'Reports',     Icon: FiBarChart2 },
      { path: '/app/notifications', label: 'Notifications', Icon: FiBell },
      { path: '/app/results',    label: 'My Results',  Icon: FiCheckSquare },
      { path: '/app/settings',   label: 'Settings',    Icon: FiSettings },
    ],
    [ROLES.WORKPLACE_SUPERVISOR]: [
      { path: '/app/dashboard',  label: 'Dashboard',        Icon: FiGrid },
      { path: '/app/placements', label: 'Assigned Interns', Icon: FiUsers },
      { path: '/app/reviews',    label: 'Review Logs',      Icon: FiCheckSquare },
      { path: '/app/notifications', label: 'Notifications', Icon: FiBell },
      { path: '/app/settings',   label: 'Settings',         Icon: FiSettings },
    ],
    [ROLES.ACADEMIC_SUPERVISOR]: [
      { path: '/app/dashboard',   label: 'Dashboard',          Icon: FiGrid },
      { path: '/app/placements',  label: 'Student Overview',   Icon: FiSearch },
      { path: '/app/reviews',     label: 'Supervisor Reviews', Icon: FiCheckSquare },
      { path: '/app/evaluations', label: 'Final Evaluations',  Icon: FiAward },
      { path: '/app/notifications', label: 'Notifications', Icon: FiBell },
      { path: '/app/settings',    label: 'Settings',           Icon: FiSettings },
    ],
    [ROLES.ADMIN]: [
      { path: '/app/dashboard',     label: 'Dashboard',       Icon: FiGrid },
      { path: '/app/users',         label: 'User Management', Icon: FiUsers },
      { path: '/app/departments',   label: 'Departments',     Icon: FiAward },
      { path: '/app/organizations', label: 'Organizations',   Icon: FiBriefcase },
      { path: '/app/system-status', label: 'System Status',   Icon: FiSettings },
      { path: '/app/deadlines',     label: 'Deadlines',       Icon: FiFileText },
      { path: '/app/reports',       label: 'System Reports',  Icon: FiBarChart2 },
      { path: '/app/notifications', label: 'Notifications', Icon: FiBell },
      { path: '/app/settings',      label: 'System Settings', Icon: FiSettings },
    ],
  };
  return items[role] || items[ROLES.STUDENT];
}

function Sidebar({ user, isOpen, onClose }) {
  const location = useLocation();
  const role = normalizeRole(user?.role?.role_name || user?.role_name);
  const sidebarItems = getSidebarItems(role);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>

        {/* Header */}
        <div className="sidebar-header">
          <h2>ILES</h2>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <FiX size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Main Menu</p>
          <ul>
            {sidebarItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={isActive ? 'active' : ''}
                  >
                    <item.Icon size={18} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <p className="sidebar-user-label">Current User</p>
            <p className="sidebar-user-name">{user?.first_name} {user?.last_name}</p>
            <p className="sidebar-user-role">{user?.role?.role_name || user?.role_name || 'Guest'}</p>
          </div>
        </div>

      </aside>
    </>
  );
}

export default Sidebar;