import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROLES } from '../../constants';

function Sidebar({ user }) {
  const location = useLocation();

  const getSidebarItems = (role) => {
    const items = {
      [ROLES.STUDENT]: [
        { path: '/app/dashboard', label: 'Dashboard' },
        { path: '/app/placements', label: 'Placements' },
        { path: '/app/logs', label: 'Logs' },
        { path: '/app/results', label: 'Results' },
      ],
      [ROLES.WORKPLACE_SUPERVISOR]: [
        { path: '/app/dashboard', label: 'Dashboard' },
        { path: '/app/placements', label: 'Assigned Interns' },
        { path: '/app/reviews', label: 'Reviews' },
      ],
      [ROLES.ACADEMIC_SUPERVISOR]: [
        { path: '/app/dashboard', label: 'Dashboard' },
        { path: '/app/evaluations', label: 'Evaluations' },
      ],
      [ROLES.ADMIN]: [
        { path: '/app/dashboard', label: 'Dashboard' },
        { path: '/app/users', label: 'Users' },
        { path: '/app/reports', label: 'Reports' },
        { path: '/app/settings', label: 'Settings' },
      ],
    };

    return items[role] || items[ROLES.STUDENT];
  };

  const sidebarItems = getSidebarItems(user?.role?.role_name);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>ILES</h2>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {sidebarItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={location.pathname.startsWith(item.path) ? 'active' : ''}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;