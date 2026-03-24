import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuth } from '../hooks/AuthContext';
import * as api from '../services/apiClient';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, placementsRes] = await Promise.all([
          api.dashboardsAPI.refreshMetrics(),
          api.placementsAPI.getPlacements(),
        ]);

        setMetrics(metricsRes);
        setPlacements(placementsRes.results);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const completionTrend = [
    { month: 'Jan', completed: 12, active: 25 },
    { month: 'Feb', completed: 18, active: 22 },
    { month: 'Mar', completed: 15, active: 28 },
    { month: 'Apr', completed: 22, active: 30 },
    { month: 'May', completed: 20, active: 32 },
  ];

  const scoreDistribution = [
    { range: '90-100', count: 8 },
    { range: '80-89', count: 15 },
    { range: '70-79', count: 12 },
    { range: '60-69', count: 5 },
    { range: '<60', count: 2 },
  ];

  const getMetricValue = (type) => {
    const metric = metrics.find(m => m.metric_type === type);
    return metric ? metric.value : 0;
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.first_name} {user?.last_name}</p>
      </header>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Students</h3>
          <div className="metric-value">{getMetricValue('total_students')}</div>
        </div>
        <div className="metric-card">
          <h3>Active Placements</h3>
          <div className="metric-value">{getMetricValue('active_placements')}</div>
        </div>
        <div className="metric-card">
          <h3>Completed Internships</h3>
          <div className="metric-value">{getMetricValue('internships_completed')}</div>
        </div>
        <div className="metric-card">
          <h3>Average Score</h3>
          <div className="metric-value">{getMetricValue('average_score').toFixed(1)}</div>
        </div>
        <div className="metric-card">
          <h3>Pending Reviews</h3>
          <div className="metric-value">{getMetricValue('pending_reviews')}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card chart-card">
          <h3>Internship Completion Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={completionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="completed" stackId="1" stroke="#8884d8" fill="#8884d8" name="Completed" />
              <Area type="monotone" dataKey="active" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Active" />
            </AreaChart>
          </ResponsiveContainer>
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

        <div className="dashboard-card">
          <h3>Recent Placements</h3>
          <ul>
            {placements.slice(0, 5).map((placement) => (
              <li key={placement.placement_id}>
                {placement.student.user.first_name} {placement.student.user.last_name} - {placement.organization.name}
                <span className={`status ${placement.status}`}>
                  {placement.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-card">
          <h3>System Actions</h3>
          <button className="action-btn" onClick={() => api.dashboardsAPI.refreshMetrics()}>
            Refresh Metrics
          </button>
          <button className="action-btn">Generate Reports</button>
          <button className="action-btn">Manage Users</button>
          <button className="action-btn">System Settings</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;