import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../../../hooks/AuthContext';
import { evaluationsAPI, placementsAPI } from '../../../services/endpoints';

import './AcademicDashboard.css';

const STATUS_COLORS = {
  completed: '#0f766e',
  pending: '#d97706',
  overdue: '#b91c1c',
};

function parseResponseArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
}

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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

        setEvaluations(parseResponseArray(evaluationsRes));
        setPlacements(parseResponseArray(placementsRes));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Derived chart data from real backend data ──────────────────────────────

  const evaluationStats = useMemo(() => {
    const completed = evaluations.filter((e) => e.total_score != null).length;
    const overdue = evaluations.filter((e) => e.is_overdue).length;
    const pending = Math.max(evaluations.length - completed - overdue, 0);

    return {
      completed,
      pending,
      overdue,
      total: evaluations.length,
    };
  }, [evaluations]);

  const evaluationStatusData = useMemo(() => [
    { name: 'Completed', value: evaluationStats.completed, color: STATUS_COLORS.completed },
    { name: 'Pending', value: evaluationStats.pending, color: STATUS_COLORS.pending },
    { name: 'Overdue', value: evaluationStats.overdue, color: STATUS_COLORS.overdue },
  ].filter((entry) => entry.value > 0), [evaluationStats]);

  // Bar chart: group evaluations by the month they were created/submitted
  const evaluationTrend = useMemo(() => {
    const monthMap = {};

    evaluations.forEach((e) => {
      const rawDate = e.created_at || e.submitted_at || e.date;
      if (!rawDate) return;

      const date = new Date(rawDate);
      const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });

      monthMap[label] = (monthMap[label] ?? 0) + 1;
    });

    return Object.entries(monthMap)
      .map(([month, count]) => ({ month, evaluations: count }))
      .sort((a, b) => {
        const toDate = (str) => new Date(`01 ${str}`);
        return toDate(a.month) - toDate(b.month);
      });
  }, [evaluations]);

  const averageScore = useMemo(() => {
    const scored = evaluations.filter((e) => typeof e.total_score === 'number');
    if (!scored.length) return null;
    const total = scored.reduce((sum, item) => sum + item.total_score, 0);
    return (total / scored.length).toFixed(1);
  }, [evaluations]);

  const recentEvaluations = useMemo(() => {
    const withDate = [...evaluations].sort((a, b) => {
      const aDate = new Date(a.updated_at || a.created_at || a.submitted_at || 0).getTime();
      const bDate = new Date(b.updated_at || b.created_at || b.submitted_at || 0).getTime();
      return bDate - aDate;
    });
    return withDate.slice(0, 5);
  }, [evaluations]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="academic-dashboard">
        <div className="dashboard-shell">
          <div className="dashboard-state">Loading academic dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="academic-dashboard">
        <div className="dashboard-shell">
          <div className="dashboard-state dashboard-state-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="academic-dashboard">
      <div className="dashboard-shell">
        <header className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <p className="eyebrow">Academic Supervisor Workspace</p>
            <h1>
              Keep evaluations tight,
              <span>students on track.</span>
            </h1>
            <p>
              Welcome back, {user?.first_name} {user?.last_name}. Here is a clear view of pending work,
              quality trends, and immediate actions.
            </p>
          </div>

          <div className="dashboard-hero-actions">
            <Link to="/app/evaluations" className="btn btn-primary">Review Pending Evaluations</Link>
            <Link to="/app/reports" className="btn btn-secondary">Open Performance Reports</Link>
          </div>
        </header>

        <section className="metrics-grid">
          <article className="metric-card">
            <p className="metric-label">Total Evaluations</p>
            <p className="metric-value">{evaluationStats.total}</p>
          </article>

          <article className="metric-card">
            <p className="metric-label">Pending</p>
            <p className="metric-value">{evaluationStats.pending}</p>
            <span className="metric-tag metric-tag-pending">Needs attention</span>
          </article>

          <article className="metric-card">
            <p className="metric-label">Completed</p>
            <p className="metric-value">{evaluationStats.completed}</p>
            <span className="metric-tag metric-tag-completed">Closed</span>
          </article>

          <article className="metric-card">
            <p className="metric-label">Students Assigned</p>
            <p className="metric-value">{placements.length}</p>
          </article>

          <article className="metric-card metric-card-emphasis">
            <p className="metric-label">Average Score</p>
            <p className="metric-value">{averageScore ?? 'N/A'}</p>
            <span className="metric-subtext">Across scored evaluations</span>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card chart-card">
            <h3>Evaluation Status Breakdown</h3>
            {evaluationStatusData.length === 0 ? (
              <p className="empty-text">No evaluation status data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={evaluationStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={98}
                    innerRadius={56}
                    dataKey="value"
                  >
                    {evaluationStatusData.map((entry, index) => (
                      <Cell key={`status-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </article>

          <article className="dashboard-card chart-card">
            <h3>Monthly Evaluation Throughput</h3>
            {evaluationTrend.length === 0 ? (
              <p className="empty-text">No monthly trend data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={evaluationTrend} margin={{ top: 8, right: 12, left: 2, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="evaluations" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </article>

          <article className="dashboard-card list-card">
            <h3>Recent Evaluation Activity</h3>
            {recentEvaluations.length === 0 ? (
              <p className="empty-text">No recent evaluations to display.</p>
            ) : (
              <ul>
                {recentEvaluations.map((evaluation) => {
                  const fullName = `${evaluation?.placement?.student?.user?.first_name ?? ''} ${evaluation?.placement?.student?.user?.last_name ?? ''}`.trim() || 'Unnamed student';
                  const score = evaluation?.total_score ?? 'Pending';
                  const status = evaluation?.is_overdue ? 'Overdue' : (evaluation?.total_score != null ? 'Completed' : 'Pending');
                  const statusClass = status.toLowerCase();

                  return (
                    <li key={evaluation.evaluation_id ?? `${fullName}-${score}`}>
                      <div>
                        <p className="student-name">{fullName}</p>
                        <p className="date-text">Updated {formatDate(evaluation.updated_at || evaluation.created_at || evaluation.submitted_at)}</p>
                      </div>
                      <div className="list-meta">
                        <span className={`status-pill status-${statusClass}`}>{status}</span>
                        <span className="score-pill">Score: {score}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <article className="dashboard-card action-card">
            <h3>Quick Actions</h3>
            <p>Jump directly into your highest-impact tasks.</p>
            <Link to="/app/evaluations" className="btn btn-primary">Complete Pending Evaluations</Link>
            <Link to="/app/placements" className="btn btn-secondary">Review Student Placements</Link>
            <Link to="/app/reports" className="btn btn-secondary">Generate Performance Reports</Link>
          </article>
        </section>
      </div>
    </div>
  );
}

export default AcademicDashboard;