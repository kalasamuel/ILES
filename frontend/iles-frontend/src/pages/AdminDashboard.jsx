import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { useAuth } from '../hooks/AuthContext';
import {
  dashboardsAPI,
  evaluationsAPI,
  placementsAPI,
  usersAPI,
  logbooksAPI,
  reviewsAPI,
  workflowAPI,
  notificationsAPI,
} from '../services/endpoints';
import './AdminDashboard.css';

const RANGE_OPTIONS = [
  { value: '7d', label: '7 days', days: 7 },
  { value: '14d', label: '2 weeks', days: 14 },
  { value: '30d', label: '30 days', days: 30 },
  { value: 'custom', label: 'Custom', days: null },
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function buildDateSeries(start, end) {
  const series = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    series.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState([]);
  const [users, setUsers] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangePreset, setRangePreset] = useState('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, usersRes, placementsRes, evaluationsRes, logsRes, reviewsRes, historyRes, notificationsRes] = await Promise.all([
          dashboardsAPI.refreshMetrics(),
          usersAPI.getUsers(),
          placementsAPI.getPlacements(),
          evaluationsAPI.getEvaluations(),
          logbooksAPI.getLogs(),
          reviewsAPI.getReviews(),
          workflowAPI.getHistory(),
          notificationsAPI.getNotifications(),
        ]);

        setMetrics(metricsRes?.results || metricsRes || []);
        setUsers(usersRes?.results || usersRes || []);
        setPlacements(placementsRes?.results || placementsRes || []);
        setEvaluations(evaluationsRes?.results || evaluationsRes || []);
        setLogs(logsRes?.results || logsRes || []);
        setReviews(reviewsRes?.results || reviewsRes || []);
        setHistory(historyRes?.results || historyRes || []);
        setNotifications(notificationsRes?.results || notificationsRes || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const range = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (rangePreset === 'custom' && customStart && customEnd) {
      const start = toDate(customStart);
      const customRangeEnd = toDate(customEnd);
      if (start && customRangeEnd) {
        start.setHours(0, 0, 0, 0);
        customRangeEnd.setHours(23, 59, 59, 999);
        return { start, end: customRangeEnd };
      }
    }

    const days = RANGE_OPTIONS.find((option) => option.value === rangePreset)?.days || 7;
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, [rangePreset, customStart, customEnd]);

  const dateSeries = useMemo(() => buildDateSeries(range.start, range.end), [range]);

  const totalUsers = users.length;
  const dailyLogs = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return logs.filter((log) => dayKey(log.submitted_at || log.created_at) === today).length;
  }, [logs]);

  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => (toDate(b.date_joined)?.getTime() || 0) - (toDate(a.date_joined)?.getTime() || 0))
      .slice(0, 5);
  }, [users]);

  const pendingReviewsCount = reviews.filter((review) => review.status === 'needs_revision').length;
  const unreadUpdatesCount = notifications.filter((notification) => !notification.is_read).length;
  const overdueLogsCount = logs.filter((log) => {
    if (log.status !== 'submitted') return false;
    const submitted = toDate(log.submitted_at || log.created_at);
    if (!submitted) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return submitted < cutoff;
  }).length;
  const issuesCount = pendingReviewsCount + unreadUpdatesCount + overdueLogsCount;

  const weeklyLogBreakdown = useMemo(() => {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);

    const logsThisWeek = logs.filter((log) => {
      const submitted = toDate(log.submitted_at || log.created_at);
      return submitted && submitted >= weekStart;
    });

    return [
      { label: 'Draft', value: logsThisWeek.filter((log) => log.status === 'draft').length },
      { label: 'Submitted', value: logsThisWeek.filter((log) => log.status === 'submitted').length },
      { label: 'Reviewed', value: logsThisWeek.filter((log) => log.status === 'reviewed').length },
      { label: 'Approved', value: logsThisWeek.filter((log) => log.status === 'approved').length },
      { label: 'Rejected', value: logsThisWeek.filter((log) => log.status === 'rejected').length },
    ];
  }, [logs]);

  const activityOverview = useMemo(() => {
    const rows = dateSeries.map((day) => ({ day, logs: 0, reviews: 0, evaluations: 0 }));
    const rowMap = new Map(rows.map((item) => [item.day, item]));

    logs.forEach((log) => {
      const key = dayKey(log.submitted_at || log.created_at);
      if (key && rowMap.has(key)) rowMap.get(key).logs += 1;
    });

    reviews.forEach((review) => {
      const key = dayKey(review.reviewed_at);
      if (key && rowMap.has(key)) rowMap.get(key).reviews += 1;
    });

    evaluations.forEach((evaluation) => {
      const key = dayKey(evaluation.evaluation_date || evaluation.created_at);
      if (key && rowMap.has(key)) rowMap.get(key).evaluations += 1;
    });

    return rows.map((item) => ({
      day: new Date(`${item.day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      logs: item.logs,
      reviews: item.reviews,
      evaluations: item.evaluations,
    }));
  }, [dateSeries, logs, reviews, evaluations]);

  const systemLogsVisualization = useMemo(() => {
    const rows = dateSeries.map((day) => ({ day, workflow: 0, updates: 0, alerts: 0 }));
    const rowMap = new Map(rows.map((item) => [item.day, item]));

    history.forEach((item) => {
      const key = dayKey(item.changed_at);
      if (key && rowMap.has(key)) rowMap.get(key).workflow += 1;
    });

    notifications.forEach((item) => {
      const key = dayKey(item.created_at);
      if (key && rowMap.has(key) && !item.is_read) rowMap.get(key).updates += 1;
    });

    reviews.forEach((item) => {
      const key = dayKey(item.reviewed_at);
      if (key && rowMap.has(key) && item.status === 'needs_revision') rowMap.get(key).alerts += 1;
    });

    return rows.map((item) => ({
      day: new Date(`${item.day}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      workflow: item.workflow,
      updates: item.updates,
      alerts: item.alerts,
    }));
  }, [dateSeries, history, notifications, reviews]);

  const monthlyTrend = useMemo(() => {
    const monthMap = placements.reduce((acc, placement) => {
      const date = toDate(placement.created_at || placement.start_date);
      if (!date) return acc;
      const month = date.toLocaleString('default', { month: 'short' });
      if (!acc[month]) {
        acc[month] = { month, completed: 0, active: 0 };
      }
      if (placement.status === 'completed') acc[month].completed += 1;
      if (placement.status === 'approved' || placement.status === 'pending') acc[month].active += 1;
      return acc;
    }, {});

    return Object.values(monthMap);
  }, [placements]);

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: '90-100', count: 0 },
      { range: '80-89', count: 0 },
      { range: '70-79', count: 0 },
      { range: '60-69', count: 0 },
      { range: '<60', count: 0 },
    ];

    evaluations.forEach((evaluation) => {
      const score = Number(evaluation.total_score);
      if (Number.isNaN(score)) return;
      if (score >= 90) buckets[0].count += 1;
      else if (score >= 80) buckets[1].count += 1;
      else if (score >= 70) buckets[2].count += 1;
      else if (score >= 60) buckets[3].count += 1;
      else buckets[4].count += 1;
    });

    return buckets;
  }, [evaluations]);

  const totalIssuesLabel = issuesCount > 0 ? `${issuesCount} issue${issuesCount === 1 ? '' : 's'} detected` : 'No open issues';
  const healthScore = Math.max(55, 100 - issuesCount * 4);
  const healthLabel = issuesCount === 0 ? 'Healthy' : issuesCount < 6 ? 'Watch list' : 'Attention needed';

  const metricsByType = (type) => {
    const metric = metrics.find((item) => item.metric_type === type);
    return metric ? metric.value : 0;
  };

  if (loading) {
    return <div className="admin-dashboard loading-state">Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.first_name} {user?.last_name}</p>
      </header>

      <div className="metrics-grid summary-grid">
        <div className="metric-card summary-card">
          <h3>Total Users</h3>
          <div className="metric-value">{totalUsers}</div>
          <p>Manage users, roles and permissions</p>
        </div>
        <div className="metric-card summary-card">
          <h3>Daily Logs</h3>
          <div className="metric-value">{dailyLogs}</div>
          <p>Logs submitted today</p>
        </div>
        <div className="metric-card summary-card">
          <h3>Issues</h3>
          <div className="metric-value">{issuesCount}</div>
          <p>{totalIssuesLabel}</p>
        </div>
        <div className="metric-card summary-card">
          <h3>System Health</h3>
          <div className="metric-value">{healthScore}%</div>
          <p>{healthLabel}</p>
        </div>
      </div>

      <div className="dashboard-grid admin-grid">
        <div className="dashboard-card stat-panel">
          <h3>User Management</h3>
          <p>Manage users, roles and permissions</p>
          <div className="panel-actions">
            <Link to="/app/users" className="btn btn-primary">Manage Users</Link>
            <Link to="/app/users" className="btn btn-secondary">View All Users</Link>
          </div>
        </div>

        <div className="dashboard-card stat-panel">
          <h3>Reports</h3>
          <p>Generate logs and activity reports</p>
          <div className="panel-actions">
            <Link to="/app/reports" className="btn btn-primary">View Reports</Link>
            <button type="button" className="btn btn-secondary">Generate Logs Report</button>
          </div>
        </div>

        <div className="dashboard-card stat-panel">
          <h3>System Overview</h3>
          <p>Monitor system health and status</p>
          <div className="status-stack">
            <div className="status-row">
              <span>Server Status</span>
              <strong className="status-good">Operational</strong>
            </div>
            <div className="status-row">
              <span>Pending Updates</span>
              <strong>{unreadUpdatesCount}</strong>
            </div>
            <div className="status-row">
              <span>Alert</span>
              <strong className={issuesCount > 0 ? 'status-warn' : 'status-good'}>{healthLabel}</strong>
            </div>
          </div>
          <div className="panel-actions">
            <Link to="/app/system-status" className="btn btn-primary">System Status</Link>
            <Link to="/app/reports" className="btn btn-secondary">Open Reports</Link>
          </div>
        </div>

        <div className="dashboard-card stat-panel">
          <h3>Logs Overview This Week</h3>
          <div className="logs-week-grid">
            {weeklyLogBreakdown.map((item) => (
              <div key={item.label} className="week-pill">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card chart-card chart-wide">
          <div className="chart-header">
            <div>
              <h3>Visualized Activity Overview</h3>
              <p>Range filter: {RANGE_OPTIONS.find((option) => option.value === rangePreset)?.label}</p>
            </div>
            <div className="filter-group">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={rangePreset === option.value ? 'filter-chip active' : 'filter-chip'}
                  onClick={() => setRangePreset(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {rangePreset === 'custom' && (
            <div className="date-filter-row">
              <label>
                Start
                <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              </label>
              <label>
                End
                <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
              </label>
            </div>
          )}

          {activityOverview.length > 0 ? (
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={activityOverview}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="logs" stackId="1" stroke="#f97316" fill="#fed7aa" name="Logs" />
                <Area type="monotone" dataKey="reviews" stackId="1" stroke="#06b6d4" fill="#cffafe" name="Reviews" />
                <Area type="monotone" dataKey="evaluations" stackId="1" stroke="#10b981" fill="#d1fae5" name="Evaluations" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No activity data available for the selected range.</p>
          )}
        </div>

        <div className="dashboard-card chart-card chart-wide">
          <div className="chart-header">
            <div>
              <h3>System Logs Visualization</h3>
              <p>Workflow history, updates, and alerts in the selected range</p>
            </div>
          </div>

          {systemLogsVisualization.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={systemLogsVisualization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="workflow" fill="#8b5cf6" name="Workflow Events" />
                <Bar dataKey="updates" fill="#f97316" name="Pending Updates" />
                <Bar dataKey="alerts" fill="#ef4444" name="Alerts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No system logs found for the selected range.</p>
          )}
        </div>

        <div className="dashboard-card chart-card">
          <h3>System Health</h3>
          <div className="status-stack health-stack">
            <div className="status-row">
              <span>Server Status</span>
              <strong className="status-good">Operational</strong>
            </div>
            <div className="status-row">
              <span>Pending Updates</span>
              <strong>{unreadUpdatesCount}</strong>
            </div>
            <div className="status-row">
              <span>Alert</span>
              <strong className={issuesCount > 0 ? 'status-warn' : 'status-good'}>{totalIssuesLabel}</strong>
            </div>
          </div>
          <div className="health-meter">
            <div className="health-meter-fill" style={{ width: `${healthScore}%` }} />
          </div>
          <p className="health-caption">{healthScore}% system health</p>
        </div>

        <div className="dashboard-card chart-card">
          <h3>Internship Completion Trend</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="completed" stackId="1" stroke="#8884d8" fill="#8884d8" name="Completed" />
                <Area type="monotone" dataKey="active" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Active" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No trend data available.</p>
          )}
        </div>

        <div className="dashboard-card chart-card">
          <h3>Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#ff7300" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card recent-users-card">
          <div className="card-title-row">
            <h3>Recent Users</h3>
            <Link to="/app/users" className="inline-link">View All</Link>
          </div>
          <ul className="compact-list">
            {recentUsers.length > 0 ? recentUsers.map((item) => (
              <li key={item.user_id}>
                <div className="user-item">
                  <strong>{item.first_name} {item.last_name}</strong>
                  <span>{item.email}</span>
                </div>
                <span className="status status-neutral">
                  {(item.role?.role_name || 'user').toLowerCase()}
                </span>
              </li>
            )) : (
              <li>No recent users</li>
            )}
          </ul>
        </div>

        <div className="dashboard-card">
          <h3>Recent Placements</h3>
          <ul className="compact-list">
            {placements.slice(0, 5).map((placement) => (
              <li key={placement.placement_id}>
                <span>{placement.student?.user?.first_name} {placement.student?.user?.last_name} - {placement.organization?.name}</span>
                <span className={`status ${placement.status}`}>
                  {placement.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-card">
          <h3>System Actions</h3>
          <div className="panel-actions">
            <Link to="/app/users" className="btn btn-primary">Manage Users</Link>
            <Link to="/app/reports" className="btn btn-secondary">View Reports</Link>
            <Link to="/app/system-status" className="btn btn-secondary">System Status</Link>
          </div>
        </div>
      </div>

      <div className="dashboard-grid bottom-grid">
        <div className="dashboard-card">
          <h3>Metrics Snapshot</h3>
          <ul className="compact-list">
            <li><span>Total Students</span><strong>{metricsByType('total_students')}</strong></li>
            <li><span>Active Placements</span><strong>{metricsByType('active_placements')}</strong></li>
            <li><span>Completed Internships</span><strong>{metricsByType('internships_completed')}</strong></li>
            <li><span>Average Score</span><strong>{toNumber(metricsByType('average_score')).toFixed(1)}</strong></li>
            <li><span>Pending Reviews</span><strong>{metricsByType('pending_reviews')}</strong></li>
          </ul>
        </div>

        <div className="dashboard-card">
          <h3>Quick Links</h3>
          <div className="panel-actions">
            <Link to="/app/users" className="btn btn-primary">Manage Users</Link>
            <Link to="/app/reports" className="btn btn-secondary">View Reports</Link>
            <Link to="/app/system-status" className="btn btn-secondary">System Status</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
