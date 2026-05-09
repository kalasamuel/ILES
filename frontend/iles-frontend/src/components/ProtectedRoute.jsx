import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';

function normalizeRole(rawRole) {
  return String(rawRole || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function ProtectedRoute({ children, allowedRoles = null }) {
  let user, isAuthenticated, isLoading;
  try {
    ({ user, isAuthenticated, isLoading } = useAuth());
  } catch (err) {
    // If the hook is used outside the provider during a transient render (HMR, race),
    // avoid crashing the whole app — show a loading state and allow the provider to mount.
    // This keeps UX stable while debugging authentication mounting issues.
    // eslint-disable-next-line no-console
    console.warn('useAuth threw an error in ProtectedRoute (likely transient):', err.message || err);
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = normalizeRole(user?.role?.role_name || user?.role_name);
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/app/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;