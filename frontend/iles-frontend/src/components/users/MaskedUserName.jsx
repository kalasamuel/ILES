import React from 'react';
import { useAuth } from '../../hooks/AuthContext';

// Shows a user's name unless their profile is hidden and the current viewer
// is neither the same user nor an admin. Falls back to `fallback` text when
// the name is not available or access is denied.
export default function MaskedUserName({ user, fallback = 'Private user' }) {
  const { user: currentUser } = useAuth();

  if (!user) return <>{fallback}</>;

  const targetId = user.user_id || user.id || user.user?.user_id || user.user?.id;
  const currentId = currentUser?.user_id || currentUser?.id;

  const isSelf = currentId && targetId && String(currentId) === String(targetId);
  const isAdmin = String(currentUser?.role?.role_name || '').toLowerCase().includes('admin');

  const visible = user.profile_visible;

  if (isSelf || isAdmin || visible === undefined || visible === true) {
    const first = user.first_name || (user.user && user.user.first_name) || '';
    const last = user.last_name || (user.user && user.user.last_name) || '';
    const full = `${first} ${last}`.trim();
    if (full) return <>{full}</>;
    // fallback to email or provided fallback
    const email = user.email || (user.user && user.user.email) || null;
    return <>{email || fallback}</>;
  }

  return <>{fallback}</>;
}
