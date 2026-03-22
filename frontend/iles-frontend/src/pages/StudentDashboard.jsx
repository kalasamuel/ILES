import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useAuth } from '../hooks/AuthContext';
import * as api from '../services/apiClient';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();

  const [placements, setPlacements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [placementsRes, logsRes, notificationsRes] = await Promise.all([
          api.placementsAPI.getPlacements(),
          api.logbooksAPI.getLogs(),
          api.notificationsAPI.getNotifications(),
        ]);

        setPlacements(placementsRes?.results || []);
        setLogs(logsRes?.results || []);
        setNotifications(notificationsRes?.results || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats
  const approvedLogs = logs.filter(log => log.status === 'approved').length;
  const pendingLogs = logs.filter(log => log.status === 'pending').length;
  const totalHours = logs.reduce((sum, log) => sum + (log.hours || 0), 0);
  const activePlacements = placements.filter(p => p.status === 'active').length;

  // Fallback / mock data for charts
  const progressData = [
    { week: 'Week 1', hours: 40, approved: 35 },
    { week: 'Week 2', hours: 42, approved: 38 },
    { week: 'Week 3', hours: 38, approved: 38 },
    { week: 'Week 4', hours: 45, approved: 40 },
  ];

  const statusData = [
    { status: 'Approved', count: approvedLogs || 3 },
    { status: 'Pending', count: pendingLogs || 1 },
    { status: 'Rejected', count: 0 },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
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
            <Link to="/weekly-log/new" className="btn-primary-small">+ New Log</Link>
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