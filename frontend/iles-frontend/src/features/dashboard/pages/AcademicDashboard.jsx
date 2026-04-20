import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useAuth } from '../../../hooks/AuthContext';
import { evaluationsAPI, placementsAPI } from '../../../services/endpoints';

function AcademicDashboard() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [evaluationsRes, placementsRes] = await Promise.all([
          evaluationsAPI.getEvaluations(),
          placementsAPI.getPlacements(),
        ]);

        setEvaluations(evaluationsRes?.results ?? []);
        setPlacements(placementsRes?.results ?? []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const completed = evaluations.filter(e => e.total_score != null).length;
    const pending = evaluations.filter(e => e.total_score == null && !e.is_overdue).length;
    const overdue = evaluations.filter(e => e.is_overdue).length;
    const scored = evaluations.filter(e => typeof e.total_score === 'number');
    const avgScore = scored.length > 0 ? (scored.reduce((sum, e) => sum + e.total_score, 0) / scored.length).toFixed(1) : 'N/A';

    return {
      total: evaluations.length,
      completed,
      pending,
      overdue,
      avgScore,
    };
  }, [evaluations]);

  // Evaluation Status Chart
  const evaluationStatusData = useMemo(() => {
    return [
      { name: 'Completed', value: kpiStats.completed, color: '#10b981' },
      { name: 'Pending', value: kpiStats.pending, color: '#f8771c' },
      { name: 'Overdue', value: kpiStats.overdue, color: '#ef4444' },
    ].filter(entry => entry.value > 0);
  }, [kpiStats]);

  // Monthly Trend
  const evaluationTrend = useMemo(() => {
    const monthMap = {};
    evaluations.forEach(e => {
      const rawDate = e.created_at || e.submitted_at || e.date;
      if (!rawDate) return;
      const date = new Date(rawDate);
      const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthMap[label] = (monthMap[label] ?? 0) + 1;
    });

    return Object.entries(monthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => new Date(`01 ${a.month}`) - new Date(`01 ${b.month}`));
  }, [evaluations]);

  // Pending tasks (students needing review)
  const pendingTasks = useMemo(() => {
    const pending = evaluations
      .filter(e => e.total_score == null && !e.is_overdue)
      .slice(0, 5)
      .map(e => ({
        id: e.evaluation_id,
        studentName: `${e.placement?.student?.user?.first_name || ''} ${e.placement?.student?.user?.last_name || ''}`.trim() || 'Unnamed',
        status: 'Pending Review',
      }));
    return pending;
  }, [evaluations]);

  if (loading) {
    return <div className="academic-dashboard"><div className="loading-state">Loading dashboard...</div></div>;
  }

  if (error) {
    return <div className="academic-dashboard"><div className="error-state">{error}</div></div>;
  }

  return (
    <div className="academic-dashboard">
      {/* Top Bar: Greeting + Actions */}
      <div className="top-bar">
        <div className="top-bar-left">
          <h2>Welcome back, {user?.first_name} {user?.last_name}</h2>
          <p>Here's your evaluation workspace for today</p>
        </div>
        <div className="top-bar-actions">
          <Link to="/app/evaluations" className="btn btn-primary">Review Pending</Link>
          <Link to="/app/reports" className="btn btn-secondary">Reports</Link>
        </div>
      </div>

      {/* Row 1: KPI Cards (5-column Bento grid) */}
      <section className="kpi-row">
        <div className="kpi-card">
          <p className="kpi-label">Total Evaluations</p>
          <p className="kpi-value">{kpiStats.total}</p>
        </div>
        <div className="kpi-card kpi-card-accent">
          <p className="kpi-label">Pending</p>
          <p className="kpi-value">{kpiStats.pending}</p>
          <span className="kpi-tag">Needs attention</span>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Completed</p>
          <p className="kpi-value">{kpiStats.completed}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Students</p>
          <p className="kpi-value">{placements.length}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Avg Score</p>
          <p className="kpi-value">{kpiStats.avgScore}</p>
          <p className="kpi-subtitle">Out of 100</p>
        </div>
      </section>

      {/* Row 2: Charts (60% + 40%) */}
      <section className="charts-row">
        {/* Evaluation Status Breakdown (Left: ~65%) */}
        <div className="dashboard-card chart-card chart-card-lg">
          <h3>Evaluation Status Breakdown</h3>
          {evaluationStatusData.length === 0 ? (
            <p className="no-data">No evaluation data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={evaluationStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {evaluationStatusData.map((entry, index) => (
                    <Cell key={`status-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Action Center (Right: ~35%) */}
        <div className="dashboard-card action-center">
          <h3>Pending Reviews</h3>
          {pendingTasks.length === 0 ? (
            <p className="no-data">All caught up! No pending reviews.</p>
          ) : (
            <ul className="task-list">
              {pendingTasks.map(task => (
                <li key={task.id} className="task-item">
                  <span className="task-name">{task.studentName}</span>
                  <span className="task-badge">{task.status}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/app/evaluations" className="btn btn-primary btn-block mt-3">
            Review All
          </Link>
        </div>
      </section>

      {/* Row 3: Trends (50% + 50%) */}
      <section className="trends-row">
        {/* Monthly Throughput */}
        <div className="dashboard-card chart-card">
          <h3>Monthly Evaluation Throughput</h3>
          {evaluationTrend.length === 0 ? (
            <p className="no-data">No monthly trend data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={evaluationTrend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                <YAxis allowDecimals={false} style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f8771c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card">
          <h3>Recent Evaluation Activity</h3>
          {evaluations.length === 0 ? (
            <p className="no-data">No recent activity</p>
          ) : (
            <ul className="activity-list">
              {evaluations.slice(0, 6).map((evaluation, idx) => (
                <li key={evaluation.evaluation_id || idx} className="activity-item">
                  <span className="activity-name">
                    {`${evaluation.placement?.student?.user?.first_name || ''} ${evaluation.placement?.student?.user?.last_name || ''}`.trim() || 'Student'}
                  </span>
                  <span className={`activity-status ${evaluation.total_score != null ? 'completed' : evaluation.is_overdue ? 'overdue' : 'pending'}`}>
                    {evaluation.total_score != null ? 'Completed' : evaluation.is_overdue ? 'Overdue' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

export default AcademicDashboard;