import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useAuth } from '../hooks/AuthContext';
import { dashboardsAPI, logbooksAPI, notificationsAPI, placementsAPI } from '../services/endpoints';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();

  const [placements, setPlacements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bootstrapAttempted, setBootstrapAttempted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        console.log('Fetching dashboard data...');
        
        const [placementsRes, logsRes, notificationsRes] = await Promise.all([
          placementsAPI.getPlacements(),
          logbooksAPI.getLogs(),
          notificationsAPI.getNotifications(),
        ]);

        let placementsData = placementsRes?.results || placementsRes || [];
        let logsData = logsRes?.results || logsRes || [];
        let notificationsData = notificationsRes?.results || notificationsRes || [];

        let context = null;
        try {
          context = await dashboardsAPI.getMyDataContext();
          console.log('Backend data context:', context);
        } catch (ctxError) {
          console.warn('Failed to load backend data context:', ctxError);
        }

        const shouldBootstrap =
          !bootstrapAttempted &&
          context &&
          String(context.role_name || '').toLowerCase().includes('student') &&
          context.has_student_profile &&
          (context.student_owned?.placements || 0) === 0 &&
          (context.student_owned?.logs || 0) === 0 &&
          (context.student_owned?.notifications || 0) === 0;

        if (shouldBootstrap) {
          try {
            console.log('No owned student data found. Bootstrapping starter data...');
            await dashboardsAPI.bootstrapMyStudentData();
            setBootstrapAttempted(true);

            const [placementsRefetch, logsRefetch, notificationsRefetch] = await Promise.all([
              placementsAPI.getPlacements(),
              logbooksAPI.getLogs(),
              notificationsAPI.getNotifications(),
            ]);

            placementsData = placementsRefetch?.results || placementsRefetch || [];
            logsData = logsRefetch?.results || logsRefetch || [];
            notificationsData = notificationsRefetch?.results || notificationsRefetch || [];
            console.log('Starter data bootstrapped successfully.');
          } catch (bootstrapError) {
            console.warn('Starter data bootstrap failed:', bootstrapError);
          }
        }

        console.log('Placements response:', placementsRes);
        console.log('Logs response:', logsRes);
        console.log('Notifications response:', notificationsRes);

        setPlacements(placementsData);
        setLogs(logsData);
        setNotifications(notificationsData);

        console.log('Dashboard data loaded:', { placements: placementsData.length, logs: logsData.length, notifications: notificationsData.length });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats
  const approvedLogs = logs.filter(log => log.status === 'approved').length;
  const pendingLogs = logs.filter(log => log.status === 'submitted' || log.status === 'reviewed').length;
  const totalHours = logs.reduce((sum, log) => sum + (Number(log.hours_worked) || 0), 0).toFixed(1);
  const activePlacements = placements.filter(p => p.status === 'approved' || p.status === 'completed').length;

  const progressMap = logs.reduce((acc, log) => {
    const week = `Week ${log.week_number}`;
    if (!acc[week]) {
      acc[week] = { week, hours: 0, approved: 0 };
    }
    const hours = Number(log.hours_worked) || 0;
    acc[week].hours += hours;
    if (log.status === 'approved') {
      acc[week].approved += hours;
    }
    return acc;
  }, {});

  const progressData = Object.values(progressMap).sort((a, b) => {
    const weekA = Number(a.week.replace('Week ', ''));
    const weekB = Number(b.week.replace('Week ', ''));
    return weekA - weekB;
  });

  const statusData = [
    { status: 'Approved', count: approvedLogs },
    { status: 'Pending', count: pendingLogs },
    { status: 'Rejected', count: logs.filter(log => log.status === 'rejected').length },
  ];

  const selectedPlacement = placements.find(
    (placement) => placement.status === 'approved' || placement.status === 'completed'
  ) || placements[0];

  const nextWeekNumber = selectedPlacement
    ? (logs
        .filter((log) => log.placement === selectedPlacement.placement_id || log.placement?.placement_id === selectedPlacement.placement_id)
        .reduce((maxWeek, log) => Math.max(maxWeek, Number(log.week_number) || 0), 0) + 1)
    : 1;

  const newLogPath = selectedPlacement
    ? `/app/logs/create/${selectedPlacement.placement_id}/${nextWeekNumber}`
    : '/app/logs/create';

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
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
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      {/* Welcome Header */}
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
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Main Grid */}
      <div className="dashboard-grid">

        {/* Placements Card */}
        <div className="dashboard-card placements-card">
          <div className="card-header">
            <div className="card-icon">🏢</div>
            <h3>My Placements</h3>
          </div>
          <div className="card-content">
            {placements.length > 0 ? (
              <ul className="placement-list">
                {placements.slice(0, 3).map((placement) => (
                  <li key={placement.placement_id} className="placement-item">
                    <div className="placement-info">
                      <strong>{placement.position_title}</strong>
                      <span className="company">{placement.organization?.name}</span>
                    </div>
                    <span className={`status-badge ${placement.status}`}>
                      {placement.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No active placements yet.</p>
            )}
          </div>
          <div className="card-footer">
            <Link to="/app/placements" className="btn-link">View All Placements →</Link>
          </div>
        </div>

        {/* Logs Card */}
        <div className="dashboard-card logs-card">
          <div className="card-header">
            <div className="card-icon">📋</div>
            <h3>Recent Logs</h3>
          </div>
          <div className="card-content">
            {logs.length > 0 ? (
              <ul className="logs-list">
                {logs.slice(0, 3).map((log) => (
                  <li key={log.log_id} className="log-item">
                    <span className="week-badge">Week {log.week_number}</span>
                    <span className={`status-badge ${log.status}`}>
                      {log.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No logs submitted yet.</p>
            )}
          </div>
          <div className="card-footer">
            <Link to="/app/logs" className="btn-link">View All Logs →</Link>
            <Link to={newLogPath} className="btn-primary-small">+ New Log</Link>
          </div>
        </div>

        {/* Notifications Card */}
        <div className="dashboard-card notifications-card">
          <div className="card-header">
            <div className="card-icon">🔔</div>
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <span className="badge">{notifications.length}</span>
            )}
          </div>
          <div className="card-content">
            {notifications.length > 0 ? (
              <ul className="notifications-list">
                {notifications.slice(0, 3).map((notification) => (
                  <li key={notification.notification_id} className="notification-item">
                    <div className="notification-dot"></div>
                    <p>{notification.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No new notifications.</p>
            )}
          </div>
          <div className="card-footer">
            <Link to="/app/notifications" className="btn-link">View All →</Link>
          </div>
        </div>

        {/* Results Card */}
        <div className="dashboard-card results-card">
          <div className="card-header">
            <div className="card-icon">🎓</div>
            <h3>Results</h3>
          </div>
          <div className="card-content">
            <p className="results-message">Check your evaluation results and performance feedback.</p>
          </div>
          <div className="card-footer">
            <Link to="/app/evaluations" className="btn-link">View Results →</Link>
          </div>
        </div>

        {/* Charts - Full Width */}
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
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#4F46E5" 
                  name="Total Hours" 
                  strokeWidth={2}
                  dot={{ fill: '#4F46E5', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="approved" 
                  stroke="#10B981" 
                  name="Approved Hours" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                />
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
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#4F46E5" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;