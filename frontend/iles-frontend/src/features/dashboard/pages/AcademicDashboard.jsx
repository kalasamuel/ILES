import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
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

  // ── Derived chart data from real backend data ──────────────────────────────

  // Pie chart: count completed, pending, overdue from actual evaluations
  const evaluationStatusData = useMemo(() => {
    const completed = evaluations.filter(e => e.total_score != null).length;
    const pending   = evaluations.filter(e => e.total_score == null && !e.is_overdue).length;
    const overdue   = evaluations.filter(e => e.is_overdue).length;

    return [
      { name: 'Completed', value: completed, color: '#00C49F' },
      { name: 'Pending',   value: pending,   color: '#FFBB28' },
      { name: 'Overdue',   value: overdue,   color: '#FF8042' },
    ].filter(entry => entry.value > 0); // hide slices with 0 so the chart stays clean
  }, [evaluations]);

  // Bar chart: group evaluations by the month they were created/submitted
  const evaluationTrend = useMemo(() => {
    const monthMap = {};

    evaluations.forEach(e => {
      // Use whichever date field your API returns; adjust the key name as needed.
      const rawDate = e.created_at || e.submitted_at || e.date;
      if (!rawDate) return;

      const date  = new Date(rawDate);
      const label = date.toLocaleString('default', { month: 'short', year: '2-digit' }); // e.g. "Jan 25"

      monthMap[label] = (monthMap[label] ?? 0) + 1;
    });

    // Sort chronologically and shape into the array recharts expects
    return Object.entries(monthMap)
      .map(([month, count]) => ({ month, evaluations: count }))
      .sort((a, b) => {
        // Parse back to dates for reliable chronological sort
        const toDate = str => new Date(`01 ${str}`);
        return toDate(a.month) - toDate(b.month);
      });
  }, [evaluations]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="academic-dashboard">
      <header className="dashboard-header">
        <h1>Academic Dashboard</h1>
        <p>Welcome, {user?.first_name} {user?.last_name}</p>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Pending Evaluations</h3>
          <div className="stat-number">{evaluations.filter(e => !e.total_score).length}</div>
          <p>Evaluations Awaiting Completion</p>
          <Link to="/app/evaluations" className="btn btn-secondary">View Evaluations</Link>
        </div>

        <div className="dashboard-card">
          <h3>My Students</h3>
          <div className="stat-number">{placements.length}</div>
          <p>Students Under Academic Supervision</p>
          <Link to="/app/placements" className="btn btn-secondary">View Students</Link>
        </div>

        <div className="dashboard-card">
          <h3>Recent Evaluations</h3>
          <ul>
            {evaluations.slice(0, 3).map((evaluation) => (
              <li key={evaluation.evaluation_id}>
                Evaluated {evaluation.placement?.student?.user?.first_name} — Score:{' '}
                {evaluation.total_score ?? 'Pending'}
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-card chart-card">
          <h3>Evaluation Status</h3>
          {evaluationStatusData.length === 0 ? (
            <p>No evaluation data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={evaluationStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {evaluationStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-card chart-card">
          <h3>Monthly Evaluations</h3>
          {evaluationTrend.length === 0 ? (
            <p>No trend data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={evaluationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="evaluations" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <Link to="/app/evaluations" className="btn btn-primary">Complete Pending Evaluations</Link>
          <Link to="/app/reports" className="btn btn-secondary">View Performance Reports</Link>
          <Link to="/app/placements" className="btn btn-secondary">Monitor Student Progress</Link>
        </div>
      </div>
    </div>
  );
}

export default AcademicDashboard;