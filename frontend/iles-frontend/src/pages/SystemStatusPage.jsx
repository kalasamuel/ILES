import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardsAPI, logbooksAPI, notificationsAPI, reviewsAPI, workflowAPI } from '../services/endpoints';
import './SystemStatusPage.css';

function SystemStatusPage() {
  const [metrics, setMetrics] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await notificationsAPI.syncAdminSystemSnapshot();
        const [metricsRes, logsRes, reviewsRes, historyRes, notificationsRes] = await Promise.all([
          dashboardsAPI.refreshMetrics(),
          logbooksAPI.getLogs(),
          reviewsAPI.getReviews(),
          workflowAPI.getHistory(),
          notificationsAPI.getNotifications(),
        ]);

        setMetrics(metricsRes?.results || metricsRes || []);
        setLogs(logsRes?.results || logsRes || []);
        setReviews(reviewsRes?.results || reviewsRes || []);
        setHistory(historyRes?.results || historyRes || []);
        setNotifications(notificationsRes?.results || notificationsRes || []);
      } catch (error) {
        console.error('Failed to load system status data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const pendingUpdates = notifications.filter((item) => !item.is_read).length;
  const issues = reviews.filter((review) => review.status === 'needs_revision').length + pendingUpdates;
  const healthScore = Math.max(55, 100 - issues * 4);

  const breakdown = useMemo(() => {
    const statusMap = { draft: 0, submitted: 0, reviewed: 0, approved: 0, rejected: 0 };
    logs.forEach((log) => {
      if (statusMap[log.status] !== undefined) {
        statusMap[log.status] += 1;
      }
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const recentAlerts = useMemo(() => {
    return [
      ...notifications.filter((item) => !item.is_read).map((item) => ({
        id: item.notification_id,
        title: item.message,
        date: item.created_at,
      })),
      ...reviews.filter((item) => item.status === 'needs_revision').map((item) => ({
        id: item.review_id,
        title: 'Review needs revision',
        date: item.reviewed_at,
      })),
    ]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5);
  }, [notifications, reviews]);

  const getMetricValue = (type) => {
    const metric = metrics.find((item) => item.metric_type === type);
    return metric ? metric.value : 0;
  };

  if (loading) {
    return <div className="system-status-page loading-state">Loading system status...</div>;
  }

  return (
    <div className="system-status-page">
      <div className="system-status-header">
        <div>
          <h2>System Status</h2>
          <p>Server health, pending updates, and system alerts.</p>
        </div>
        <Link to="/app/dashboard" className="status-link">Back to Dashboard</Link>
      </div>

      <div className="status-metrics-grid">
        <div className="status-card">
          <div className="status-label">Server Status</div>
          <div className="status-value status-good">Operational</div>
        </div>
        <div className="status-card">
          <div className="status-label">Pending Updates</div>
          <div className="status-value">{pendingUpdates}</div>
        </div>
        <div className="status-card">
          <div className="status-label">Issues</div>
          <div className="status-value">{issues}</div>
        </div>
        <div className="status-card">
          <div className="status-label">System Health</div>
          <div className="status-value status-warn">{healthScore}%</div>
        </div>
      </div>

      <div className="status-grid">
        <div className="status-card panel-card">
          <h3>Logs Overview This Week</h3>
          <div className="week-grid">
            {breakdown.map((item) => (
              <div key={item.name} className="week-card">
                <div className="week-label">{item.name}</div>
                <div className="week-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="status-card panel-card">
          <h3>Alert: System Health</h3>
          <p className="panel-copy">
            {issues === 0
              ? 'No active alerts are currently affecting the system.'
              : 'There are active alerts that require administrative attention.'}
          </p>
          <ul className="panel-list">
            <li>Daily logs: {getMetricValue('total_students') ? 'Tracked live' : 'Unavailable'}</li>
            <li>Pending reviews: {getMetricValue('pending_reviews')}</li>
            <li>Recent updates: {pendingUpdates}</li>
          </ul>
        </div>
      </div>

      <div className="status-card chart-card">
        <h3>System Logs Visualization</h3>
        <p className="panel-copy">Recent workflow events and log activity.</p>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={history.slice(0, 10).map((item) => ({
              name: item.entity_type,
              value: 1,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#ff7a00" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="status-grid">
        <div className="status-card panel-card">
          <h3>Recent Alerts</h3>
          <ul className="alert-list">
            {recentAlerts.length > 0 ? recentAlerts.map((item) => (
              <li key={item.id} className="alert-item">
                <div className="alert-title">{item.title}</div>
                <div className="alert-date">{item.date ? new Date(item.date).toLocaleString() : 'Date unavailable'}</div>
              </li>
            )) : <li className="empty-text">No recent alerts.</li>}
          </ul>
        </div>

        <div className="status-card panel-card">
          <h3>Snapshot</h3>
          <ul className="panel-list">
            <li>Total logs: {logs.length}</li>
            <li>Total workflow events: {history.length}</li>
            <li>Unread updates: {pendingUpdates}</li>
            <li>Metrics tracked: {metrics.length}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SystemStatusPage;
