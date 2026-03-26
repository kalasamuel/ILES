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
  const { user, isAuthenticated, isLoading } = useAuth();

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