import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../hooks/AuthContext';
import { reviewsAPI, placementsAPI } from '../services/endpoints';
import './SupervisorDashboard.css';

function SupervisorDashboard() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reviewsRes, placementsRes] = await Promise.all([
          reviewsAPI.getReviews(),
          placementsAPI.getPlacements(),
        ]);

        setReviews(reviewsRes.results || reviewsRes);
        setPlacements(placementsRes.results || placementsRes);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate real data from API responses
  const getReviewStatusData = () => {
    const approved = reviews.filter(r => r.status === 'approved').length;
    const needsRevision = reviews.filter(r => r.status === 'needs_revision').length;
    const rejected = reviews.filter(r => r.status === 'rejected').length;
    
    return [
      { name: 'Approved', value: approved, color: '#00C49F' },
      { name: 'Needs Revision', value: needsRevision, color: '#FFBB28' },
      { name: 'Rejected', value: rejected, color: '#FF8042' },
    ].filter(item => item.value > 0);
  };

  // Calculate monthly workload from reviews
  const getWorkloadData = () => {
    const monthlyData = {};
    
    reviews.forEach(review => {
      if (review.created_at) {
        const date = new Date(review.created_at);
        const month = date.toLocaleString('default', { month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }
    });
    
    // Convert to array and sort by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months
      .filter(month => monthlyData[month])
      .map(month => ({
        month,
        reviews: monthlyData[month]
      }));
  };

  const reviewStatusData = getReviewStatusData();
  const workloadData = getWorkloadData();

  // Calculate pending reviews count
  const pendingReviewsCount = reviews.filter(r => r.status === 'needs_revision').length;

  // Get recent activity (last 3 reviews)
  const recentActivity = [...reviews]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  if (loading) {
    return <div className="loading-container">Loading dashboard...</div>;
  }

  return (
    <div className="supervisor-dashboard">
      <header className="dashboard-header">
        <h1>Supervisor Dashboard</h1>
        <p>Welcome back, {user?.first_name} {user?.last_name}</p>
      </header>

      <div className="dashboard-grid">
        {/* Pending Reviews Card */}
        <div className="dashboard-card">
          <h3>Pending Reviews</h3>
          <div className="stat-number">{pendingReviewsCount}</div>
          <p>Logs awaiting your review</p>
          {pendingReviewsCount > 0 && (
            <Link to="/app/reviews?status=needs_revision" className="btn btn-primary">
              Review Now
            </Link>
          )}
          <Link to="/app/reviews" className="btn btn-secondary">
            View All Reviews
          </Link>
        </div>

        {/* My Students Card */}
        <div className="dashboard-card">
          <h3>My Students</h3>
          <div className="stat-number">{placements.length}</div>
          <p>Active placements supervised</p>
          <Link to="/app/placements" className="btn btn-secondary">
            View Students
          </Link>
        </div>

        {/* Recent Activity Card */}
        <div className="dashboard-card">
          <h3>Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <ul className="activity-list">
              {recentActivity.map((review) => (
                <li key={review.review_id}>
                  <span className="activity-icon">📝</span>
                  <div className="activity-details">
                    <strong>Week {review.log?.week_number}</strong>
                    <span>
                      {review.log?.placement?.student?.user?.first_name}{' '}
                      {review.log?.placement?.student?.user?.last_name}
                    </span>
                    <span className={`status-badge status-${review.status}`}>
                      {review.status?.replace('_', ' ')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No recent activity</p>
          )}
          <Link to="/app/reviews" className="btn-link">
            View All Activity →
          </Link>
        </div>

        {/* Review Status Distribution Chart */}
        <div className="dashboard-card chart-card">
          <h3>Review Status Distribution</h3>
          {reviewStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={reviewStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {reviewStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No review data available</p>
          )}
        </div>

        {/* Monthly Workload Chart */}
        <div className="dashboard-card chart-card">
          <h3>Monthly Workload</h3>
          {workloadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="reviews" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No workload data available</p>
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <Link to="/app/reviews?status=needs_revision" className="btn btn-primary">
              Review Pending Logs
            </Link>
            <Link to="/app/placements" className="btn btn-secondary">
              View Student Progress
            </Link>
            <Link to="/app/reports" className="btn btn-secondary">
              Generate Reports
            </Link>
            <Link to="/app/students" className="btn btn-secondary">
              Manage Students
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupervisorDashboard;