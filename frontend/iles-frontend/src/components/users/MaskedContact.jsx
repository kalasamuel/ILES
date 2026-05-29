import React from 'react';
import { useAuth } from '../../hooks/AuthContext';

// Render a user's phone number only if allowed (self or admin or profile_visible)
export default function MaskedContact({ user, fallback = '' }) {
  const { user: currentUser } = useAuth();
  if (!user) return <>{fallback}</>;

  const targetId = user.user_id || user.id || user.user?.user_id || user.user?.id;
  const currentId = currentUser?.user_id || currentUser?.id;
  const isSelf = currentId && targetId && String(currentId) === String(targetId);
  const isAdmin = String(currentUser?.role?.role_name || '').toLowerCase().includes('admin');

  const visible = user.profile_visible;
  const showPhone = typeof user.show_phone !== 'undefined' ? user.show_phone : undefined;
  const phone = user.phone_number || (user.user && user.user.phone_number) || null;

  if (isSelf || isAdmin) {
    return <>{phone || fallback}</>;
  }

  // If profile is explicitly hidden, do not show contact
  if (visible === false) return <>{fallback}</>;

  // If show_phone exists and is false, hide phone for non-admin/non-self
  if (showPhone === false) return <>{fallback}</>;

  return <>{phone || fallback}</>;
}
