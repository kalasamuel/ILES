import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../../../hooks/AuthContext';
import { reviewsAPI, placementsAPI } from '../../../services/endpoints';

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

        setReviews(Array.isArray(reviewsRes)
          ? reviewsRes
          : Array.isArray(reviewsRes?.results)
            ? reviewsRes.results
            : []);

        setPlacements(Array.isArray(placementsRes)
          ? placementsRes
          : Array.isArray(placementsRes?.results)
            ? placementsRes.results
            : []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Mock data for charts
  const reviewStatusData = [
    { name: 'Approved', value: 15, color: '#00C49F' },
    { name: 'Needs Revision', value: 8, color: '#FFBB28' },
    { name: 'Rejected', value: 2, color: '#FF8042' },
  ];

  const workloadData = [
    { month: 'Jan', reviews: 12 },
    { month: 'Feb', reviews: 18 },
    { month: 'Mar', reviews: 15 },
    { month: 'Apr', reviews: 22 },
  ];

  const userRole = user?.role?.role_name;

  let visiblePlacements = placements;
  if (userRole === 'workplace_supervisor') {
    visiblePlacements = placements.filter((placement) =>
      placement?.workplace_supervisor_details?.user?.user_id === user?.user_id
    );
  } else if (userRole === 'academic_supervisor') {
    visiblePlacements = placements.filter((placement) =>
      user?.department && placement?.student_details?.user?.department?.department_id === user.department.department_id
    );
  }

  let visibleReviews = reviews;
  if (userRole === 'workplace_supervisor') {
    visibleReviews = reviews.filter((review) =>
      review?.log?.placement?.workplace_supervisor?.user_id === user?.user_id ||
      review?.log?.placement?.workplace_supervisor_details?.user?.user_id === user?.user_id
    );
  } else if (userRole === 'academic_supervisor') {
    visibleReviews = reviews.filter((review) =>
      user?.department && review?.log?.placement?.student?.user?.department?.department_id === user.department.department_id
    );
  }

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="supervisor-dashboard">
      <header className="dashboard-header">
        <h1>Supervisor Dashboard</h1>
        <p>Welcome, {user?.first_name} {user?.last_name}</p>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Pending Reviews</h3>
          <div className="stat-number">{(visibleReviews || []).filter(r => r?.status === 'needs_revision').length}</div>
          <p>Logs awaiting your review</p>
          <Link to="/app/reviews" className="btn btn-secondary">Review Logs</Link>
        </div>

        <div className="dashboard-card">
          <h3>My Students</h3>
          <div className="stat-number">{visiblePlacements.length}</div>
          <p>Active placements supervised</p>
          <Link to="/app/placements" className="btn btn-secondary">View Students</Link>
        </div>

        <div className="dashboard-card">
          <h3>Recent Activity</h3>
          <ul>
            {visibleReviews.slice(0, 3).map((review) => (
              <li key={review.review_id}>
                Reviewed Week {review.log?.week_number ?? review.log?.placement?.week_number} for {review.log?.placement?.student?.user?.first_name ?? 'N/A'}
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-card chart-card">
          <h3>Review Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={reviewStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
        </div>

        <div className="dashboard-card chart-card">
          <h3>Monthly Workload</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={workloadData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="reviews" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <Link to="/app/reviews" className="btn btn-primary">Review Pending Logs</Link>
          <Link to="/app/placements" className="btn btn-secondary">View Student Progress</Link>
          <Link to="/app/reports" className="btn btn-secondary">Generate Reports</Link>
        </div>
      </div>
    </div>
  );
}

export default SupervisorDashboard;