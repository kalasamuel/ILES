import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useAuth } from '../hooks/AuthContext';
import {
  dashboardsAPI,
  logbooksAPI,
  notificationsAPI,
  placementsAPI,
  reviewsAPI,
} from '../services/endpoints';
import './StudentDashboard.css';

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortByDateDesc(leftValue, rightValue) {
  return (toDate(rightValue)?.getTime() || 0) - (toDate(leftValue)?.getTime() || 0);
}

function formatDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString() : 'Date unavailable';
}

function truncate(value, maxLength = 120) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function getLogDate(log) {
  return log?.submitted_at || log?.updated_at || log?.created_at || null;
}

const StudentDashboard = () => {
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

        const [placementsRes, logsRes, reviewsRes, notificationsRes] = await Promise.all([
          placementsAPI.getPlacements(),
          logbooksAPI.getLogs(),
          reviewsAPI.getReviews(),
          notificationsAPI.getNotifications(),
        ]);

        let placementsData = placementsRes?.results || placementsRes || [];
        let logsData = logsRes?.results || logsRes || [];
        let reviewsData = reviewsRes?.results || reviewsRes || [];
        let notificationsData = notificationsRes?.results || notificationsRes || [];

        let context = null;
        try {
          context = await dashboardsAPI.getMyDataContext();
        } catch (ctxError) {
          console.warn('Failed to load dashboard context:', ctxError);
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

            const [placementsRefetch, logsRefetch, reviewsRefetch, notificationsRefetch] = await Promise.all([
              placementsAPI.getPlacements(),
              logbooksAPI.getLogs(),
              reviewsAPI.getReviews(),
              notificationsAPI.getNotifications(),
            ]);

            placementsData = placementsRefetch?.results || placementsRefetch || [];
            logsData = logsRefetch?.results || logsRefetch || [];
            reviewsData = reviewsRefetch?.results || reviewsRefetch || [];
            notificationsData = notificationsRefetch?.results || notificationsRefetch || [];
          } catch (bootstrapError) {
            console.warn('Student bootstrap failed:', bootstrapError);
          }
        }

        setPlacements(placementsData);
        setLogs(logsData);
        setReviews(reviewsData);
        setNotifications(notificationsData);
      } catch (fetchError) {
        console.error('Error fetching student dashboard data:', fetchError);
        setError(fetchError.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activePlacements = useMemo(
    () => placements.filter((placement) => placement.status === 'approved' || placement.status === 'completed').length,
    [placements]
  );

  const approvedLogs = useMemo(
    () => logs.filter((log) => log.status === 'approved').length,
    [logs]
  );

  const pendingLogs = useMemo(
    () => logs.filter((log) => log.status === 'submitted' || log.status === 'reviewed').length,
    [logs]
  );

  const totalHours = useMemo(
    () => logs.reduce((sum, log) => sum + (Number(log.hours_worked) || 0), 0).toFixed(1),
    [logs]
  );

  const logsById = useMemo(
    () => new Map(logs.map((log) => [String(log.log_id), log])),
    [logs]
  );

  const selectedPlacement = useMemo(
    () => placements.find((placement) => placement.status === 'approved' || placement.status === 'completed') || placements[0],
    [placements]
  );

  const nextWeekNumber = useMemo(() => {
    if (!selectedPlacement) return 1;

    const placementId = selectedPlacement.placement_id;
    return (
      logs
        .filter((log) => log.placement === placementId || log.placement?.placement_id === placementId)
        .reduce((maxWeek, log) => Math.max(maxWeek, Number(log.week_number) || 0), 0) + 1
    );
  }, [logs, selectedPlacement]);

  const newLogPath = selectedPlacement
    ? `/app/logs/create/${selectedPlacement.placement_id}/${nextWeekNumber}`
    : '/app/logs/create';

  const recentLogs = useMemo(
    () => [...logs].sort((left, right) => sortByDateDesc(getLogDate(left), getLogDate(right))).slice(0, 3),
    [logs]
  );

  const feedbackItems = useMemo(
    () => [...reviews]
      .filter((review) => String(review?.comments || '').trim())
      .sort((left, right) => sortByDateDesc(left.reviewed_at, right.reviewed_at))
      .slice(0, 3),
    [reviews]
  );

  const activityItems = useMemo(() => {
    const logItems = logs.map((log) => ({
      id: `log-${log.log_id}`,
      title: log.status === 'draft' ? 'Draft saved' : 'Log updated',
      detail: `Week ${log.week_number} • ${String(log.status || 'draft').replace(/_/g, ' ')}`,
      date: getLogDate(log),
      type: 'Log',
      href: '/app/logs',
    }));

    const reviewItems = reviews.map((review) => {
      const relatedLog = logsById.get(String(review.log));
      return {
        id: `review-${review.review_id}`,
        title: 'Supervisor feedback received',
        detail: relatedLog
          ? `Week ${relatedLog.week_number} • ${truncate(review.comments, 90)}`
          : truncate(review.comments, 90),
        date: review.reviewed_at,
        type: 'Feedback',
        href: '/app/evaluations',
      };
    });

    const notificationItems = notifications.map((notification) => ({
      id: `notification-${notification.notification_id}`,
      title: notification.notification_type?.replace(/_/g, ' ') || 'Notification',
      detail: truncate(notification.message, 90),
      date: notification.created_at,
      type: notification.is_read ? 'Read' : 'New',
      href: '/app/notifications',
    }));

    return [...logItems, ...reviewItems, ...notificationItems]
      .sort((left, right) => sortByDateDesc(left.date, right.date))
      .slice(0, 5);
  }, [logs, reviews, notifications, logsById]);

  const progressData = useMemo(() => {
    const progressMap = logs.reduce((accumulator, log) => {
      const week = `Week ${log.week_number}`;
      if (!accumulator[week]) {
        accumulator[week] = { week, hours: 0, approved: 0 };
      }

      const hours = Number(log.hours_worked) || 0;
      accumulator[week].hours += hours;
      if (log.status === 'approved') {
        accumulator[week].approved += hours;
      }

      return accumulator;
    }, {});

    return Object.values(progressMap).sort((left, right) => {
      const leftWeek = Number(left.week.replace('Week ', ''));
      const rightWeek = Number(right.week.replace('Week ', ''));
      return leftWeek - rightWeek;
    });
  }, [logs]);

  const statusData = useMemo(
    () => [
      { status: 'Approved', count: approvedLogs },
      { status: 'Pending', count: pendingLogs },
      { status: 'Rejected', count: logs.filter((log) => log.status === 'rejected').length },
    ],
    [approvedLogs, pendingLogs, logs]
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container" style={{ padding: '20px', margin: '20px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '4px', color: '#c62828' }}>
        <h2>⚠️ Error Loading Dashboard</h2>
        <p><strong>Error:</strong> {error}</p>
        <p style={{ fontSize: '12px', marginTop: '10px' }}>Check browser console (F12) for more details.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <div className="welcome-header">
        <div className="welcome-content">
          <h1>
            Welcome back, <span className="highlight">{user?.first_name || 'Student'}!</span>
          </h1>
          <p>Here's what's happening with your internship journey today.</p>
        </div>
        <div className="date-badge">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{activePlacements}</h3>
            <p>Active Placements</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <h3>{logs.length}</h3>
            <p>Total Logs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <h3>{approvedLogs}</h3>
            <p>Approved Logs</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-info">
            <h3>{totalHours}</h3>
            <p>Total Hours</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card submit-logs-card">
          <div className="card-header">
            <div className="card-icon">📝</div>
            <h3>Submit Logs</h3>
          </div>
          <div className="card-content">
            {selectedPlacement ? (
              <>
                <p className="results-message">
                  Continue your internship reporting for <strong>{selectedPlacement.position_title}</strong> at <strong>{selectedPlacement.organization?.name}</strong>.
                </p>
                <div className="submit-summary">
                  <span className="week-badge">Next: Week {nextWeekNumber}</span>
                  <span className={`status-badge ${selectedPlacement.status}`}>{selectedPlacement.status}</span>
                </div>
              </>
            ) : (
              <p className="empty-state">No active placement is available yet. Once approved, you can submit your weekly log here.</p>
            )}
          </div>
          <div className="card-footer">
            <Link to={newLogPath} className="btn-primary-small">
              <span>Submit Logs</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="dashboard-card logs-card">
          <div className="card-header">
            <div className="card-icon">📋</div>
            <h3>View Submissions</h3>
          </div>
          <div className="card-content">
            {recentLogs.length > 0 ? (
              <ul className="logs-list">
                {recentLogs.map((log) => (
                  <li key={log.log_id} className="log-item">
                    <Link to={`/app/logs/${log.log_id}`} className="submission-link">
                      <span className="week-badge">Week {log.week_number}</span>
                      <span className={`status-badge ${log.status || 'draft'}`}>{log.status || 'draft'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No submissions yet. Your saved drafts will appear here.</p>
            )}
          </div>
          <div className="card-footer">
            <Link to="/app/logs" className="btn-view-all">
              <span>View Submissions</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="dashboard-card notifications-card">
          <div className="card-header">
            <div className="card-icon">💬</div>
            <h3>See Feedback</h3>
            {feedbackItems.length > 0 && <span className="badge">{feedbackItems.length}</span>}
          </div>
          <div className="card-content">
            {feedbackItems.length > 0 ? (
              <ul className="feedback-list">
                {feedbackItems.map((review) => {
                  const relatedLog = logsById.get(String(review.log));
                  return (
                    <li key={review.review_id} className="feedback-item">
                      <div className="feedback-item-top">
                        <strong>{relatedLog ? `Week ${relatedLog.week_number}` : 'Log feedback'}</strong>
                        <span className={`status-badge ${review.status || 'approved'}`}>{String(review.status || 'feedback').replace(/_/g, ' ')}</span>
                      </div>
                      <p>{truncate(review.comments, 120)}</p>
                      <span className="feedback-meta">
                        From {review.supervisor_details?.first_name || 'Supervisor'} {review.supervisor_details?.last_name || ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-state">No supervisor feedback yet. Submitted logs and comments will appear here.</p>
            )}
          </div>
          <div className="card-footer">
            <Link to="/app/evaluations" className="btn-view-all">
              <span>Open Feedback & Results</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="dashboard-card results-card">
          <div className="card-header">
            <div className="card-icon">🕒</div>
            <h3>Recent Activities</h3>
          </div>
          <div className="card-content">
            {activityItems.length > 0 ? (
              <ul className="activity-list">
                {activityItems.map((activity) => (
                  <li key={activity.id} className="activity-item">
                    <div className="activity-item-main">
                      <span className="activity-dot" />
                      <div>
                        <strong>{activity.title}</strong>
                        <p>{activity.detail}</p>
                      </div>
                    </div>
                    <div className="activity-item-side">
                      <span className="activity-type">{activity.type}</span>
                      <span className="activity-date">{formatDate(activity.date)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Recent actions from your logs, feedback, and notifications will appear here.</p>
            )}
          </div>
          <div className="card-footer">
            <Link to="/app/activities" className="btn-view-all">
              <span>View All Activities</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="dashboard-card chart-card full-width">
          <div className="card-header">
            <div className="card-icon">📈</div>
            <h3>Weekly Progress</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="week" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="hours" stroke="#4F46E5" name="Total Hours" strokeWidth={2} dot={{ fill: '#4F46E5', r: 4 }} />
                <Line type="monotone" dataKey="approved" stroke="#10B981" name="Approved Hours" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-card chart-card">
          <div className="card-header">
            <div className="card-icon">📊</div>
            <h3>Log Status Overview</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="status" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;