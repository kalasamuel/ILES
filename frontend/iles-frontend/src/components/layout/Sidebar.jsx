import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  GraduationCap, 
  Users, 
  BarChart3, 
  Settings, 
  X,
  ClipboardCheck,
  Search
} from 'lucide-react';
import { ROLES } from '../../constants';

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

function Sidebar({ user, isOpen, onClose }) {
  const location = useLocation();

  const getSidebarItems = (role) => {
    const items = {
      [ROLES.STUDENT]: [
        { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/app/placements', label: 'Placements', icon: Briefcase },
        { path: '/app/logs', label: 'My Logs', icon: FileText },
        { path: '/app/results', label: 'My Results', icon: ClipboardCheck },
      ],
      [ROLES.WORKPLACE_SUPERVISOR]: [
        { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/app/placements', label: 'Assigned Interns', icon: Users },
        { path: '/app/reviews', label: 'Review Logs', icon: ClipboardCheck },
      ],
      [ROLES.ACADEMIC_SUPERVISOR]: [
        { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/app/placements', label: 'Student Overview', icon: Search },
        { path: '/app/reviews', label: 'Supervisor Reviews', icon: ClipboardCheck },
        { path: '/app/evaluations', label: 'Final Evaluations', icon: GraduationCap },
      ],
      [ROLES.ADMIN]: [
        { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/app/users', label: 'User Management', icon: Users },
        { path: '/app/reports', label: 'System Reports', icon: BarChart3 },
        { path: '/app/settings', label: 'System Settings', icon: Settings },
      ],
    };
    return items[role] || items[ROLES.STUDENT];
  };

  const sidebarItems = getSidebarItems(
    normalizeRole(user?.role?.role_name || user?.role_name)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-zinc-950/20 backdrop-blur-sm transition-opacity lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar Aside */}
      <aside className={`
        fixed left-0 top-0 z-50 h-screen w-72 bg-white border-r border-zinc-200 
        transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header (hidden on desktop if navbar handles logo) */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-100 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 text-white">
               <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                 <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                 <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5"/>
               </svg>
            </div>
            <span className="font-bold text-zinc-900 tracking-tight">ILES</span>
          </div>
          <button 
            className="inline-flex items-center justify-center rounded-lg w-9 h-9 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100" 
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex flex-col h-full py-6 overflow-y-auto scrollbar-none">
          <div className="px-6 mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Main Menu
            </h3>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {sidebarItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`
                    group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' 
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}
                  `}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`} />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-1 h-1 rounded-full bg-white opacity-50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Footer or Info */}
          <div className="mt-auto px-6 pt-6 border-t border-zinc-100">
            <div className="rounded-2xl bg-zinc-50 p-4 border border-zinc-100">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-tight mb-1">Current User</p>
              <p className="text-sm font-bold text-zinc-900 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] text-zinc-400 truncate capitalize">
                {user?.role?.role_name || user?.role_name || 'Guest'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;