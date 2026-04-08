import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';

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
import AcademicDashboard from '../features/dashboard/pages/AcademicDashboard';

// Other Pages
import PlacementsPage from '../pages/PlacementsPage';
import Login from '../pages/Login';
import LogsPage from '../pages/LogsPage';
import ReviewsPage from '../pages/ReviewsPage';
import EvaluationsPage from '../pages/EvaluationsPage';
import ReportsPage from '../pages/ReportsPage';
import ActivitiesPage from '../pages/ActivitiesPage';
import AdminUsersPage from '../pages/AdminUsersPage';
import DepartmentsPage from '../pages/DepartmentsPage';
import OrganizationsPage from '../pages/OrganizationsPage';
import SystemStatusPage from '../pages/SystemStatusPage';
import NotificationsPage from '../pages/NotificationsPage';
import DeadlinesPage from '../pages/DeadlinesPage';
import SettingsPage from '../pages/SettingsPage';
import HelpPage from '../pages/HelpPage';
import PrivacyPage from '../pages/PrivacyPage';
import TermsPage from '../pages/TermsPage';
import ContactPage from '../pages/ContactPage';
import NotFoundPage from '../pages/NotFoundPage';

import ProtectedRoute from '../components/ProtectedRoute';

// Role-based Dashboard component
function Dashboard() {
  const { user } = useAuth();
  if (!user || !user.role) return <div>Loading...</div>;

  const rawRole = user?.role?.role_name || user?.role_name || 'student';
  const roleName = String(rawRole).trim().toLowerCase().replace(/[\s-]+/g, '_');

  switch (roleName) {
    case 'student':
      return <StudentDashboard />;
    case 'supervisor':
    case 'workplace_supervisor':
    case 'workplace':
      return <SupervisorDashboard />;
    case 'academic_supervisor':
    case 'academic':
      return <AcademicDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
}

function Router() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>

      {/* Protected App Routes */}
      <Route path="/app" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="placements/*" element={<PlacementsPage />} />
        <Route path="logs/*" element={<LogsPage />} />
        <Route path="reviews/*" element={<ReviewsPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        } />
        <Route path="departments" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DepartmentsPage />
          </ProtectedRoute>
        } />
        <Route path="organizations" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <OrganizationsPage />
          </ProtectedRoute>
        } />
        <Route path="system-status" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SystemStatusPage />
          </ProtectedRoute>
        } />
        <Route path="deadlines" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DeadlinesPage />
          </ProtectedRoute>
        } />
        <Route path="reports/*" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="help" element={<HelpPage />} />

        {/* Role-restricted routes */}
        <Route path="results" element={
          <ProtectedRoute allowedRoles={['student', 'academic_supervisor', 'admin']}>
            <EvaluationsPage />
          </ProtectedRoute>
        } />
        <Route path="evaluations/*" element={
          <ProtectedRoute allowedRoles={['academic_supervisor', 'admin']}>
            <EvaluationsPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default Router;