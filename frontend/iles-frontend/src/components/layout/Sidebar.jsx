import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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

// SVG icons replacing lucide-react
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Briefcase: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  FileText: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  ClipboardCheck: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  GraduationCap: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

function getSidebarItems(role) {
  const items = {
    [ROLES.STUDENT]: [
      { path: '/app/dashboard', label: 'Dashboard',   Icon: Icons.Dashboard },
      { path: '/app/placements', label: 'Placements',  Icon: Icons.Briefcase },
      { path: '/app/logs',       label: 'My Logs',     Icon: Icons.FileText },
      { path: '/app/results',    label: 'My Results',  Icon: Icons.ClipboardCheck },
    ],
    [ROLES.WORKPLACE_SUPERVISOR]: [
      { path: '/app/dashboard',  label: 'Dashboard',       Icon: Icons.Dashboard },
      { path: '/app/placements', label: 'Assigned Interns', Icon: Icons.Users },
      { path: '/app/reviews',    label: 'Review Logs',     Icon: Icons.ClipboardCheck },
    ],
    [ROLES.ACADEMIC_SUPERVISOR]: [
      { path: '/app/dashboard',   label: 'Dashboard',         Icon: Icons.Dashboard },
      { path: '/app/placements',  label: 'Student Overview',  Icon: Icons.Search },
      { path: '/app/reviews',     label: 'Supervisor Reviews', Icon: Icons.ClipboardCheck },
      { path: '/app/evaluations', label: 'Final Evaluations', Icon: Icons.GraduationCap },
    ],
    [ROLES.ADMIN]: [
      { path: '/app/dashboard',     label: 'Dashboard',       Icon: Icons.Dashboard },
      { path: '/app/users',         label: 'User Management', Icon: Icons.Users },
      { path: '/app/organizations', label: 'Organizations',   Icon: Icons.Briefcase },
      { path: '/app/system-status', label: 'System Status',   Icon: Icons.Settings },
      { path: '/app/reports',       label: 'System Reports',  Icon: Icons.BarChart },
      { path: '/app/settings',      label: 'System Settings', Icon: Icons.Settings },
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
            <Icons.Close />
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
                    <item.Icon />
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