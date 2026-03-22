import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../hooks/AuthContext';

// Layouts
import PublicLayout from '../components/layout/PublicLayout';
import AppLayout from '../components/layout/AppLayout';

// Auth Pages
import LandingPage from '../features/auth/pages/LandingPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';

// Dashboard Pages
import StudentDashboard from '../pages/StudentDashboard';
import SupervisorDashboard from '../pages/SupervisorDashboard';
import AdminDashboard from '../pages/AdminDashboard';

// Other Pages - placeholders for now
import PlacementsPage from '../pages/PlacementsPage';
import Login from '../pages/Login';
import LogsPage from '../pages/LogsPage';
import ReviewsPage from '../pages/ReviewsPage';
import EvaluationsPage from '../pages/EvaluationsPage';
import ReportsPage from '../pages/ReportsPage';
import NotificationsPage from '../pages/NotificationsPage';
import SettingsPage from '../pages/SettingsPage';
import HelpPage from '../pages/HelpPage';

import ProtectedRoute from '../components/ProtectedRoute';

function Router() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="privacy" element={<div>Privacy Policy Page</div>} />
          <Route path="terms" element={<div>Terms Page</div>} />
          <Route path="contact" element={<div>Contact Page</div>} />
          
          {/* Public Dashboard Routes - No authentication required */}
          <Route path="student-dashboard" element={<StudentDashboard />} />
          <Route path="supervisor-dashboard" element={<SupervisorDashboard />} />
          <Route path="admin-dashboard" element={<AdminDashboard />} />
        </Route>

        {/* Protected App Routes */}
        <Route path="/app" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="placements/*" element={<PlacementsPage />} />
          <Route path="reviews/*" element={<ReviewsPage />} />
          <Route path="evaluations/*" element={<EvaluationsPage />} />
          <Route path="reports/*" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

// Role-based Dashboard component (kept for protected routes)
function Dashboard() {
  const { user } = useAuth();

  if (!user || !user.role) return <div>Loading...</div>;

  const roleName = user.role.role_name || user.role_name || 'student';

  switch (roleName) {
    case 'student':
      return <StudentDashboard />;
    case 'workplace_supervisor':
    case 'academic_supervisor':
      return <SupervisorDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
}

export default Router;