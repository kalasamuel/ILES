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

function formatStatusLabel(value) {
  return String(value || 'pending').replace(/_/g, ' ');
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

        // Debug: inspect raw API responses when student dashboard shows no data
        // eslint-disable-next-line no-console
        // console.debug('StudentDashboard raw responses', { placementsRes, logsRes, reviewsRes, notificationsRes });

        let placementsData = placementsRes?.results || placementsRes || [];
        let logsData = logsRes?.results || logsRes || [];
        let reviewsData = reviewsRes?.results || reviewsRes || [];
        let notificationsData = notificationsRes?.results || notificationsRes || [];

        // Removed automatic bootstrapping of sample/student data to avoid unexpected
        // auto-generated content. Dashboard will only display what exists for the
        // current user via the standard API calls above.

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

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const completionRate = useMemo(() => {
    if (!logs.length) return 0;
    return Math.round((approvedLogs / logs.length) * 100);
  }, [logs, approvedLogs]);

  if (loading) {
    return (
      <div className="student-dashboard loading-shell">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-dashboard loading-shell">
        <div className="error-container">
          <h2>Unable to Load Dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <section className="studio-hero">
        <div className="hero-copy">
          <p className="hero-kicker">Student Dashboard</p>
          <h1>
            Welcome{user?.first_name ? `, ${user.first_name}` : ''}.
          </h1>
          <p>
            Your weekly logs, supervisor feedback, and progress in one place.
          </p>
        </div>
        <div className="hero-date-chip">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </section>

      <section className="kpi-strip">
        <article className="kpi-card">
          <p className="kpi-label">Active Placement</p>
          <p className="kpi-value">{activePlacements}</p>
          <p className="kpi-footnote">Current internship assignment</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Total Logs</p>
          <p className="kpi-value">{logs.length}</p>
          <p className="kpi-footnote">All submitted weekly entries</p>
        </article>
        <article className="kpi-card kpi-card-accent">
          <p className="kpi-label">Approval Rate</p>
          <p className="kpi-value">{completionRate}%</p>
          <p className="kpi-footnote">Approved out of total logs</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Unread Alerts</p>
          <p className="kpi-value">{unreadNotifications}</p>
          <p className="kpi-footnote">Notifications waiting for review</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Hours Logged</p>
          <p className="kpi-value">{totalHours}</p>
          <p className="kpi-footnote">Cumulative internship hours</p>
        </article>
      </section>

      <section className="studio-grid">
        <article className="panel panel-primary">
          <header className="panel-header">
            <h2>Logbook</h2>
            {selectedPlacement ? <span className="pill">Week {nextWeekNumber} next</span> : <span className="pill">No active placement</span>}
          </header>
          <div className="panel-body">
            {selectedPlacement ? (
              <p className="panel-copy">
                Continue your weekly report for <strong>{selectedPlacement.position_title || 'your placement'}</strong>
                {selectedPlacement.organization?.name ? ` at ${selectedPlacement.organization.name}` : ''}.
              </p>
            ) : (
              <p className="panel-copy">No active placement is available yet. Once approved, your weekly log workflow will appear here.</p>
            )}
            <div className="cta-row">
              <Link to={newLogPath} className="button button-strong">
                Submit This Week's Log
              </Link>
              <Link to="/app/logs" className="button button-muted">
                Open All Logs
              </Link>
            </div>
          </div>
        </article>

        <article className="panel">
          <header className="panel-header">
            <h2>Recent Submissions</h2>
            <Link to="/app/logs" className="panel-link">See all</Link>
          </header>
          <div className="panel-body">
            {recentLogs.length > 0 ? (
              <ul className="entry-list compact">
                {recentLogs.map((log) => (
                  <li key={log.log_id}>
                    <Link to={`/app/logs/${log.log_id}`} className="entry-line">
                      <span className="entry-main">Week {log.week_number}</span>
                      <span className={`entry-status ${log.status || 'draft'}`}>{formatStatusLabel(log.status || 'draft')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No submissions yet.</p>
            )}
          </div>
        </article>

        <article className="panel panel-tall">
          <header className="panel-header">
            <h2>Activity Feed</h2>
            <Link to="/app/activities" className="panel-link">Open timeline</Link>
          </header>
          <div className="panel-body">
            {activityItems.length > 0 ? (
              <ul className="timeline-list">
                {activityItems.map((activity) => (
                  <li key={activity.id}>
                    <div className="timeline-dot" />
                    <div className="timeline-copy">
                      <strong>{activity.title}</strong>
                      <p>{activity.detail}</p>
                      <span>{formatDate(activity.date)}</span>
                    </div>
                    <span className="timeline-type">{activity.type}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No recent activity yet.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <header className="panel-header">
            <h2>Supervisor Feedback</h2>
            <Link to="/app/evaluations" className="panel-link">Open results</Link>
          </header>
          <div className="panel-body">
            {feedbackItems.length > 0 ? (
              <ul className="entry-list">
                {feedbackItems.map((review) => {
                  const relatedLog = logsById.get(String(review.log));
                  return (
                    <li key={review.review_id}>
                      <div className="feedback-head">
                        <strong>{relatedLog ? `Week ${relatedLog.week_number}` : 'Log feedback'}</strong>
                        <span className={`entry-status ${review.status || 'approved'}`}>{formatStatusLabel(review.status || 'approved')}</span>
                      </div>
                      <p>{truncate(review.comments, 120)}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-state">No feedback received yet.</p>
            )}
          </div>
        </article>

        <article className="panel panel-chart panel-wide">
          <header className="panel-header">
            <h2>Weekly Progress Curve</h2>
          </header>
          <div className="panel-body chart-panel-body">
            <ResponsiveContainer width="100%" height={285}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="2 6" stroke="#fed7aa" />
                <XAxis dataKey="week" stroke="#7c3d0c" />
                <YAxis stroke="#7c3d0c" />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #fed7aa' }} />
                <Legend />
                <Line type="monotone" dataKey="hours" stroke="#ea580c" name="Total Hours" strokeWidth={3} dot={{ fill: '#ea580c', r: 3 }} />
                <Line type="monotone" dataKey="approved" stroke="#14532d" name="Approved Hours" strokeWidth={3} dot={{ fill: '#14532d', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel panel-chart">
          <header className="panel-header">
            <h2>Status Breakdown</h2>
          </header>
          <div className="panel-body chart-panel-body">
            <ResponsiveContainer width="100%" height={235}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="2 6" stroke="#fed7aa" />
                <XAxis dataKey="status" stroke="#7c3d0c" />
                <YAxis stroke="#7c3d0c" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #fed7aa' }} />
                <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel panel-alerts panel-wide">
          <header className="panel-header">
            <h2>Alert Inbox</h2>
            <Link to="/app/notifications" className="panel-link">Manage</Link>
          </header>
          <div className="panel-body">
            {notifications.length > 0 ? (
              <ul className="entry-list compact">
                {notifications.slice(0, 4).map((notification) => (
                  <li key={notification.notification_id}>
                    <div className="alert-line">
                      <span className={`alert-indicator ${notification.is_read ? 'read' : 'unread'}`} />
                      <div>
                        <strong>{formatStatusLabel(notification.notification_type || 'Notification')}</strong>
                        <p>{truncate(notification.message, 110)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No alerts right now.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default StudentDashboard;