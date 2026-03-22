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

  // Fallback / mock data for charts
  const progressData = [
    { week: 'Week 1', hours: 40, approved: 35 },
    { week: 'Week 2', hours: 42, approved: 38 },
    { week: 'Week 3', hours: 38, approved: 38 },
    { week: 'Week 4', hours: 45, approved: 40 },
  ];

  const statusData = [
    { status: 'Approved', count: 3 },
    { status: 'Pending', count: 1 },
    { status: 'Rejected', count: 0 },
  ];

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <h1>Student Dashboard</h1>
        <p>Welcome, {user?.first_name} {user?.last_name}</p>
      </header>

      <div className="dashboard-grid">

        {/* Placements */}
        <div className="dashboard-card">
          <h3>My Placements</h3>
          {placements.length > 0 ? (
            <ul>
              {placements.slice(0, 3).map((placement) => (
                <li key={placement.placement_id}>
                  {placement.position_title} at {placement.organization?.name}
                  <span className={`status ${placement.status}`}>
                    {placement.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No placements yet.</p>
          )}
          <Link to="/app/placements" className="btn btn-secondary">View Placements</Link>
        </div>

        {/* Logs */}
        <div className="dashboard-card">
          <h3>Weekly Logs</h3>
          {logs.length > 0 ? (
            <ul>
              {logs.slice(0, 3).map((log) => (
                <li key={log.log_id}>
                  Week {log.week_number} - {log.status}
                </li>
              ))}
            </ul>
          ) : (
            <p>No logs submitted yet.</p>
          )}
          <Link to="/app/logs" className="btn btn-secondary">View Logs</Link>
          <br />
          <Link to="/weekly-log/new">Submit New Log</Link>
        </div>

        {/* Notifications */}
        <div className="dashboard-card">
          <h3>Notifications</h3>
          {notifications.length > 0 ? (
            <ul>
              {notifications.slice(0, 3).map((notification) => (
                <li key={notification.notification_id}>
                  {notification.message}
                </li>
              ))}
            </ul>
          ) : (
            <p>No new notifications.</p>
          )}
          <Link to="/app/notifications" className="btn btn-secondary">View Notifications</Link>
        </div>

        {/* Results Navigation */}
        <div className="dashboard-card">
          <h3>Results</h3>
          <p>View your evaluation results</p>
          <Link to="/app/evaluations" className="btn btn-secondary">View Results</Link>
        </div>

        {/* Charts */}
        <div className="dashboard-card chart-card">
          <h3>Weekly Progress</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="hours" stroke="#8884d8" name="Total Hours" />
              <Line type="monotone" dataKey="approved" stroke="#82ca9d" name="Approved Hours" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card chart-card">
          <h3>Log Status Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;
