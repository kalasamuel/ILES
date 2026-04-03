import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/AuthContext';
import { notificationsAPI } from '../../services/endpoints';

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

  // Get initials from user's first + last name
  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-zinc-200/80 shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">

        {/* Left — hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            aria-label="Toggle sidebar"
            className="inline-flex items-center justify-center rounded-lg w-9 h-9 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Logo / App name */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3.33 1.67 8.67 1.67 12 0v-5"/>
              </svg>
            </div>
            <span className="font-semibold text-zinc-900 tracking-tight text-sm hidden sm:block">ILES</span>
          </div>
        </div>

        {/* Right — notifications + profile */}
        <div className="flex items-center gap-2">

          {/* Notifications */}
          <button
            aria-label="Notifications"
            className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-zinc-200 mx-1 hidden sm:block" />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 select-none">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-sm font-medium text-zinc-900 truncate max-w-[120px]">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-xs text-zinc-500 truncate max-w-[120px] capitalize">
                  {user?.role?.role_name || user?.role_name || 'User'}
                </span>
              </div>
              <svg className="w-4 h-4 text-zinc-400 hidden sm:block flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-48 rounded-xl bg-white border border-zinc-200 shadow-lg shadow-zinc-200/50 py-1 overflow-hidden">
                  <div className="px-3 py-2 border-b border-zinc-100 mb-1">
                    <p className="text-xs font-medium text-zinc-900 truncate">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}

export default Navbar;