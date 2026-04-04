import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, CheckCircle2, Clock, FileText, Bell, Send, MessageSquare, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';
import { dashboardsAPI, logbooksAPI, notificationsAPI, placementsAPI, reviewsAPI } from '../services/endpoints';
import './StudentDashboard.css';

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString() : 'Date unavailable';
}

function getUserLabel(placement) {
  const first = placement?.student_details?.user_details?.first_name || '';
  const last = placement?.student_details?.user_details?.last_name || '';
  const label = `${first} ${last}`.trim();
  return label || placement?.student_details?.registration_number || 'Your placement';
}

function StudentDashboard() {
  const { user } = useAuth();
  const [placements, setPlacements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const bootstrapAttemptedRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [placementsRes, logsRes, notificationsRes, reviewsRes] = await Promise.all([
          placementsAPI.getPlacements(),
          logbooksAPI.getLogs(),
          notificationsAPI.getNotifications(),
          reviewsAPI.getReviews(),
        ]);

        let placementsData = placementsRes?.results || placementsRes || [];
        let logsData = logsRes?.results || logsRes || [];
        let notificationsData = notificationsRes?.results || notificationsRes || [];
        let reviewsData = reviewsRes?.results || reviewsRes || [];

        let context = null;
        try {
          context = await dashboardsAPI.getMyDataContext();
        } catch (ctxError) {
          console.warn('Failed to load backend data context:', ctxError);
        }

        const shouldBootstrap =
          !bootstrapAttemptedRef.current &&
          context &&
          String(context.role_name || '').toLowerCase().includes('student') &&
          context.has_student_profile &&
          (context.student_owned?.placements || 0) === 0 &&
          (context.student_owned?.logs || 0) === 0 &&
          (context.student_owned?.notifications || 0) === 0;

        if (shouldBootstrap) {
          try {
            await dashboardsAPI.bootstrapMyStudentData();
            bootstrapAttemptedRef.current = true;

            const [placementsRefetch, logsRefetch, notificationsRefetch, reviewsRefetch] = await Promise.all([
              placementsAPI.getPlacements(),
              logbooksAPI.getLogs(),
              notificationsAPI.getNotifications(),
              reviewsAPI.getReviews(),
            ]);

            placementsData = placementsRefetch?.results || placementsRefetch || [];
            logsData = logsRefetch?.results || logsRefetch || [];
            notificationsData = notificationsRefetch?.results || notificationsRefetch || [];
            reviewsData = reviewsRefetch?.results || reviewsRefetch || [];
          } catch (bootstrapError) {
            console.warn('Starter data bootstrap failed:', bootstrapError);
          }
        }

        setPlacements(placementsData);
        setLogs(logsData);
        setNotifications(notificationsData);
        setReviews(reviewsData);
      } catch (fetchError) {
        console.error('Error fetching dashboard data:', fetchError);
        setError(fetchError.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const approvedLogs = logs.filter((log) => log.status === 'approved').length;
  const submittedLogs = logs.filter((log) => log.status === 'submitted').length;
  const totalHours = logs.reduce((sum, log) => sum + (Number(log.hours_worked) || 0), 0).toFixed(1);
  const activePlacements = placements.filter((placement) => placement.status === 'approved' || placement.status === 'completed').length;

  const selectedPlacement = placements.find((placement) => placement.status === 'approved' || placement.status === 'completed') || placements[0];

  const nextWeekNumber = selectedPlacement
    ? logs
        .filter((log) => log.placement === selectedPlacement.placement_id || log.placement?.placement_id === selectedPlacement.placement_id)
        .reduce((maxWeek, log) => Math.max(maxWeek, Number(log.week_number) || 0), 0) + 1
    : 1;

  const submitLogPath = selectedPlacement
    ? `/app/logs/create/${selectedPlacement.placement_id}/${nextWeekNumber}`
    : '/app/logs/create';

  const recentActivities = useMemo(() => {
    const placementMap = new Map(placements.map((placement) => [placement.placement_id, placement]));

    const logActivities = logs.map((log) => ({
      id: `log-${log.log_id}`,
      title: `Week ${log.week_number} log ${log.status}`,
      detail: `${log.hours_worked || 0} hours • ${getUserLabel(placementMap.get(log.placement))}`,
      date: log.submitted_at || log.created_at,
      kind: log.status === 'approved' ? 'success' : log.status === 'rejected' ? 'danger' : 'neutral',
      icon: FileText,
    }));

    const feedbackActivities = reviews.map((review) => ({
      id: `review-${review.review_id}`,
      title: 'Supervisor feedback received',
      detail: review.comments || `Status: ${String(review.status || 'unknown').replace('_', ' ')}`,
      date: review.reviewed_at,
      kind: review.status === 'approved' ? 'success' : review.status === 'rejected' ? 'danger' : 'warning',
      icon: MessageSquare,
    }));

    const notificationActivities = notifications.map((notification) => ({
      id: `notification-${notification.notification_id}`,
      title: notification.notification_type?.replace('_', ' ') || 'Notification',
      detail: notification.message,
      date: notification.created_at,
      kind: notification.is_read ? 'neutral' : 'warning',
      icon: Bell,
    }));

    return [...logActivities, ...feedbackActivities, ...notificationActivities]
      .sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0))
      .slice(0, 5);
  }, [logs, reviews, notifications, placements]);

  if (loading) {
    return (
      <div className="student-dashboard loading-state">
        <div className="loading-spinner" />
        <p>Synchronizing your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-dashboard error-state">
        <div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
        <button type="button" onClick={() => window.location.reload()} className="student-button student-button-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <div className="student-header">
        <div>
          <p className="eyebrow">Student Dashboard</p>
          <h1>Hello, {user?.first_name?.toUpperCase() || 'STUDENT'}!</h1>
          <p className="header-copy">
            You've completed <strong>{approvedLogs}</strong> logs and submitted <strong>{submittedLogs}</strong> pending entries so far.
          </p>
        </div>
        <div className="date-pill">
          <Calendar className="date-icon" />
          <span>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="student-actions-grid">
        <Link to={submitLogPath} className="action-card action-card-primary">
          <div className="action-icon action-icon-primary"><Send className="icon" /></div>
          <div>
            <h3>Submit Logs</h3>
            <p>Submit your internship activities.</p>
          </div>
          <ArrowUpRight className="action-arrow" />
        </Link>

        <Link to="/app/logs" className="action-card">
          <div className="action-icon"><FileText className="icon" /></div>
          <div>
            <h3>View Submissions</h3>
            <p>View your submitted logs.</p>
          </div>
          <ArrowUpRight className="action-arrow" />
        </Link>

        <Link to="/app/reviews" className="action-card">
          <div className="action-icon"><MessageSquare className="icon" /></div>
          <div>
            <h3>See Feedback</h3>
            <p>Check feedback from supervisors.</p>
          </div>
          <ArrowUpRight className="action-arrow" />
        </Link>
      </div>

      <div className="student-summary-grid">
        <div className="summary-card">
          <div className="summary-icon summary-icon-indigo"><Briefcase className="icon" /></div>
          <div>
            <span>{activePlacements}</span>
            <p>Active placements</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon summary-icon-sky"><FileText className="icon" /></div>
          <div>
            <span>{logs.length}</span>
            <p>Total logs</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon summary-icon-emerald"><CheckCircle2 className="icon" /></div>
          <div>
            <span>{approvedLogs}</span>
            <p>Approved logs</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon summary-icon-rose"><Clock className="icon" /></div>
          <div>
            <span>{totalHours}</span>
            <p>Total hours</p>
          </div>
        </div>
      </div>

      <div className="student-content-grid">
        <div className="content-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Recent Activities</p>
              <h2>Latest updates</h2>
            </div>
            <Link to="/app/logs" className="text-link">View Submissions</Link>
          </div>

          <div className="activity-list">
            {recentActivities.length > 0 ? recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="activity-item">
                  <div className={`activity-badge activity-badge-${activity.kind}`}>
                    <Icon className="icon" />
                  </div>
                  <div className="activity-body">
                    <div className="activity-top">
                      <strong>{activity.title}</strong>
                      <span>{formatDate(activity.date)}</span>
                    </div>
                    <p>{activity.detail}</p>
                  </div>
                </div>
              );
            }) : (
              <p className="empty-state">No recent activities yet.</p>
            )}
          </div>
        </div>

        <div className="content-card side-card">
          <div className="card-head">
            <div>
              <p className="eyebrow">Quick Access</p>
              <h2>Your internship tools</h2>
            </div>
          </div>

          <div className="quick-links">
            <Link to={submitLogPath} className="quick-link">Submit Logs</Link>
            <Link to="/app/logs" className="quick-link">View Submissions</Link>
            <Link to="/app/reviews" className="quick-link">See Feedback</Link>
            <Link to="/app/notifications" className="quick-link">Notifications</Link>
          </div>

          <div className="status-stack">
            <div className="status-line">
              <span>Current placement</span>
              <strong>{selectedPlacement ? selectedPlacement.position_title : 'No active placement'}</strong>
            </div>
            <div className="status-line">
              <span>Pending logs</span>
              <strong>{submittedLogs}</strong>
            </div>
            <div className="status-line">
              <span>Feedback items</span>
              <strong>{reviews.length}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
