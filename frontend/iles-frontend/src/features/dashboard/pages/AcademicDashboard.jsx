import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBarChart2, FiClock, FiStar, FiTrendingUp, FiFileText, FiCalendar, FiZap, FiCheck } from 'react-icons/fi';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../../hooks/AuthContext';
import { evaluationsAPI, placementsAPI } from '../../../services/endpoints';
import { exportChartRefAsPNG } from '../../../utils/chartExport';
import './AcademicDashboard.css';

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString() : 'Date unavailable';
}

function sortByDateDesc(leftValue, rightValue) {
  return (toDate(rightValue)?.getTime() || 0) - (toDate(leftValue)?.getTime() || 0);
}

function getPlacementKey(placement) {
  return String(placement?.placement_id ?? placement?.id ?? '');
}

function getStudentLabel(placement) {
  const user = placement?.student_details?.user_details || placement?.student?.user_details || placement?.student?.user || null;
  const firstName = user?.first_name || placement?.student_details?.first_name || placement?.student?.first_name || '';
  const lastName = user?.last_name || placement?.student_details?.last_name || placement?.student?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) return fullName;
  return placement?.student_details?.registration_number || placement?.student?.registration_number || 'Unnamed student';
}

function getPlacementLabel(placement) {
  return placement?.position_title || placement?.title || placement?.organization?.name || 'Placement';
}

function getEvaluationDate(evaluation) {
  return evaluation?.evaluation_date || evaluation?.submitted_at || evaluation?.created_at || null;
}

function getEvaluationScore(evaluation) {
  const score = Number(evaluation?.total_score);
  return Number.isFinite(score) ? score : null;
}

function AcademicDashboard() {
  const { user } = useAuth();
  const histogramRef = useRef(null);
  const [evaluations, setEvaluations] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);

        const [evaluationsRes, placementsRes] = await Promise.all([
          evaluationsAPI.getEvaluations(),
          placementsAPI.getPlacements(),
        ]);

        setEvaluations(evaluationsRes?.results ?? evaluationsRes ?? []);
        setPlacements(placementsRes?.results ?? placementsRes ?? []);
      } catch (fetchError) {
        console.error('Error fetching dashboard data:', fetchError);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const placementsById = useMemo(
    () => new Map(placements.map((placement) => [getPlacementKey(placement), placement])),
    [placements]
  );

  const dashboardStats = useMemo(() => {
    const completed = evaluations.filter((evaluation) => evaluation.total_score != null || evaluation.grade != null).length;
    const pending = evaluations.filter((evaluation) => evaluation.total_score == null && !evaluation.is_overdue).length;
    const overdue = evaluations.filter((evaluation) => evaluation.is_overdue).length;
    const scoredEvaluations = evaluations.filter((evaluation) => Number.isFinite(Number(evaluation.total_score)));
    const averageScore = scoredEvaluations.length > 0
      ? (scoredEvaluations.reduce((sum, evaluation) => sum + Number(evaluation.total_score), 0) / scoredEvaluations.length).toFixed(1)
      : 'N/A';

    return {
      total: evaluations.length,
      completed,
      pending,
      overdue,
      averageScore,
      completionRate: evaluations.length > 0 ? Math.round((completed / evaluations.length) * 100) : 0,
    };
  }, [evaluations]);

  const assignedStudents = useMemo(() => {
    const uniqueStudents = new Map();

    placements.forEach((placement) => {
      const studentId = placement?.student_details?.student_id || placement?.student?.student_id || placement?.student || placement?.student_details?.user_details?.user_id;
      const key = String(studentId || getPlacementKey(placement));

      if (!uniqueStudents.has(key)) {
        uniqueStudents.set(key, placement);
      }
    });

    return Array.from(uniqueStudents.values());
  }, [placements]);

  const statusChartData = useMemo(() => {
    return [
      { name: 'Completed', value: dashboardStats.completed, color: '#10b981' },
      { name: 'Pending', value: dashboardStats.pending, color: '#ff7a00' },
      { name: 'Overdue', value: dashboardStats.overdue, color: '#ef4444' },
    ].filter((entry) => entry.value > 0);
  }, [dashboardStats]);

  const monthlyTrend = useMemo(() => {
    const monthMap = new Map();

    evaluations.forEach((evaluation) => {
      const date = toDate(getEvaluationDate(evaluation));
      if (!date) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
          order: date.getTime(),
          count: 0,
        });
      }

      monthMap.get(key).count += 1;
    });

    return Array.from(monthMap.values())
      .sort((left, right) => left.order - right.order)
      .map(({ month, count }) => ({ month, count }));
  }, [evaluations]);

  const activityHeatmap = useMemo(() => {
    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heatmap = weekdayLabels.map((day, dayIndex) => ({
      day,
      dayIndex,
      hours: Array.from({ length: 24 }, (_, hour) => ({ hour, value: 0 })),
    }));

    evaluations.forEach((evaluation) => {
      const date = toDate(getEvaluationDate(evaluation));
      if (!date) return;
      heatmap[date.getDay()].hours[date.getHours()].value += 1;
    });

    return heatmap;
  }, [evaluations]);

  const scoreHistogram = useMemo(() => {
    const scores = evaluations.map(getEvaluationScore).filter((score) => Number.isFinite(score));
    const buckets = Array.from({ length: 10 }, (_, index) => ({
      label: `${index * 10}-${index === 9 ? '100' : `${index * 10 + 9}`}`,
      count: 0,
    }));

    scores.forEach((score) => {
      const bucketIndex = Math.min(9, Math.floor(score / 10));
      buckets[bucketIndex].count += 1;
    });

    return buckets;
  }, [evaluations]);

  const histogramMax = useMemo(() => {
    return scoreHistogram.reduce((max, bucket) => Math.max(max, bucket.count), 0) || 1;
  }, [scoreHistogram]);

  const pendingEvaluations = useMemo(() => {
    return [...evaluations]
      .filter((evaluation) => evaluation.total_score == null && !evaluation.is_overdue)
      .sort((left, right) => sortByDateDesc(getEvaluationDate(left), getEvaluationDate(right)))
      .slice(0, 5)
      .map((evaluation) => {
        const placement = placementsById.get(String(evaluation?.placement?.placement_id || evaluation?.placement || '')) || evaluation?.placement;

        return {
          id: evaluation?.evaluation_id || evaluation?.id,
          student: getStudentLabel(placement),
          placement: getPlacementLabel(placement),
          date: getEvaluationDate(evaluation),
        };
      });
  }, [evaluations, placementsById]);

  const recentActivity = useMemo(() => {
    return [...evaluations]
      .sort((left, right) => sortByDateDesc(getEvaluationDate(left), getEvaluationDate(right)))
      .slice(0, 5)
      .map((evaluation) => {
        const placement = placementsById.get(String(evaluation?.placement?.placement_id || evaluation?.placement || '')) || evaluation?.placement;

        return {
          id: evaluation?.evaluation_id || evaluation?.id,
          student: getStudentLabel(placement),
          detail: getPlacementLabel(placement),
          date: getEvaluationDate(evaluation),
          status: evaluation?.total_score != null ? 'completed' : evaluation?.is_overdue ? 'overdue' : 'pending',
        };
      });
  }, [evaluations, placementsById]);

  function Heatmap({ data }) {
    const maxValue = data.reduce(
      (max, row) => Math.max(max, ...row.hours.map((cell) => cell.value)),
      0,
    ) || 1;

    return (
      <div className="heatmap-shell">
        <div className="heatmap-grid">
          {data.map((row) => (
            <div key={row.day} className="heatmap-row" aria-label={row.day}>
              <div className="heatmap-day-label">{row.day}</div>
              <div className="heatmap-cells">
                {row.hours.map((cell) => {
                  const intensity = cell.value / maxValue;
                  return (
                    <div
                      key={`${row.day}-${cell.hour}`}
                      className="heatmap-cell"
                      title={`${row.day} ${cell.hour}:00 - ${cell.value} evaluations`}
                      style={{
                        backgroundColor: `rgba(255, 122, 0, ${0.06 + intensity * 0.9})`,
                        borderColor: `rgba(255, 122, 0, ${0.12 + intensity * 0.3})`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="heatmap-legend">Low <span className="legend-scale" /> High</div>
      </div>
    );
  }

  function ScoreHistogram({ data }) {
    return (
      <div className="score-histogram-shell" ref={histogramRef}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickMargin={8} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry) => {
                const opacity = Math.max(0.2, Math.min(1, entry.count / histogramMax));
                return <Cell key={entry.label} fill={`rgba(255, 122, 0, ${opacity})`} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (loading) {
    return <div className="academic-dashboard"><div className="loading-container">Loading dashboard...</div></div>;
  }

  if (error) {
    return (
      <div className="academic-dashboard">
        <div className="error-container">
          <h2>⚠️ Error Loading Dashboard</h2>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="academic-dashboard">
      <div className="welcome-header">
        <div className="welcome-content">
          <h1>
            Welcome back, <span className="highlight">{user?.first_name || 'Academic Supervisor'}</span>
          </h1>
          <p>Review evaluations, track completion, and keep your placement records current.</p>
        </div>
        <div className="date-badge">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-image">
            <FiBarChart2 size={80} aria-label="Evaluation chart logo" />
          </div>
          <div className="stat-info">
            <h3>{dashboardStats.total}</h3>
            <p>Total Evaluations</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiCheck aria-hidden="true" /></div>
          <div className="stat-info">
            <h3>{dashboardStats.completed}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiClock aria-hidden="true" /></div>
          <div className="stat-info">
            <h3>{dashboardStats.pending}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiStar aria-hidden="true" /></div>
          <div className="stat-info">
            <h3>{dashboardStats.averageScore}</h3>
            <p>Avg Score</p>
          </div>
        </div>
      </div>

      <div className="dashboard-section dashboard-section--overview">
        <div className="dashboard-card chart-card full-width">
          <div className="card-header">
            <div className="card-icon"><FiTrendingUp aria-hidden="true" /></div>
            <h3>Evaluation Status Overview</h3>
          </div>
          <div className="chart-container">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={104}
                    dataKey="value"
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="no-data">No evaluation data available yet.</p>
            )}
          </div>

          <div className="evaluation-overview">
            <div className="overview-pill">
              <span>Students in scope</span>
              <strong>{assignedStudents.length}</strong>
            </div>
            <div className="overview-pill">
              <span>Completion rate</span>
              <strong>{dashboardStats.completionRate}%</strong>
            </div>
            <div className="overview-pill">
              <span>Overdue</span>
              <strong>{dashboardStats.overdue}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-section dashboard-section--two-up">
        <div className="dashboard-card half-width dashboard-card--priority">
          <div className="card-header">
            <div className="card-icon"><FiFileText aria-hidden="true" /></div>
            <h3>Pending Evaluations</h3>
          </div>
          <div className="card-content">
            {pendingEvaluations.length > 0 ? (
              <ul className="activity-list compact-list">
                {pendingEvaluations.map((evaluation) => (
                  <li key={evaluation.id}>
                    <div className="activity-details">
                      <strong>{evaluation.student}</strong>
                      <span>{evaluation.placement}</span>
                      <span>{formatDate(evaluation.date)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-data">No pending evaluations right now.</p>
            )}
          </div>
          <div className="card-footer">
            <Link to="/app/evaluations" className="btn-link">
              Review Evaluations →
            </Link>
          </div>
        </div>

        <div className="dashboard-card half-width dashboard-card--priority">
          <div className="card-header">
            <div className="card-icon"><FiClock aria-hidden="true" /></div>
            <h3>Recent Evaluation Activity</h3>
          </div>
          <div className="card-content">
            {recentActivity.length > 0 ? (
              <ul className="activity-list">
                {recentActivity.map((item) => (
                  <li key={item.id}>
                    <div className="activity-details">
                      <strong>{item.student}</strong>
                      <span>{item.detail}</span>
                      <span>{formatDate(item.date)}</span>
                    </div>
                    <span className={`status-badge status-${item.status}`}>
                      {item.status === 'completed' ? 'Completed' : item.status === 'overdue' ? 'Overdue' : 'Pending'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-data">No recent activity to display.</p>
            )}
          </div>
          <div className="card-footer">
            <Link to="/app/activities" className="btn-link">
              View Activity Log →
            </Link>
          </div>
        </div>
      </div>

      <div className="dashboard-section dashboard-section--analytics">
        <div className="dashboard-card chart-card dashboard-card--analytics">
          <div className="card-header">
            <div className="card-icon"><FiCalendar aria-hidden="true" /></div>
            <h3>Monthly Evaluation Throughput</h3>
          </div>
          <div className="chart-container">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ff7a00" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="no-data">No monthly trend data available.</p>
            )}
          </div>
        </div>

        <div className="dashboard-card chart-card dashboard-card--insight">
          <div className="card-header">
            <div className="card-icon"><FiTrendingUp aria-hidden="true" /></div>
            <h3>Activity Heatmap</h3>
          </div>
          <div className="chart-container">
            <Heatmap data={activityHeatmap} />
          </div>
        </div>
      </div>

      <div className="dashboard-section dashboard-section--insight">
        <div className="dashboard-card chart-card full-width dashboard-card--insight">
          <div className="card-header card-header--split">
            <div className="card-header-main">
              <div className="card-icon"><FiBarChart2 aria-hidden="true" /></div>
              <h3>Score Distribution</h3>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => exportChartRefAsPNG(histogramRef, 'score-distribution.png')}>
              Export PNG
            </button>
          </div>
          <div className="chart-container">
            {scoreHistogram.some((bucket) => bucket.count > 0) ? (
              <ScoreHistogram data={scoreHistogram} />
            ) : (
              <p className="no-data">No scored evaluations available yet.</p>
            )}
          </div>
        </div>

        <div className="dashboard-card dashboard-card--actions full-width">
          <div className="card-header">
            <div className="card-icon"><FiZap aria-hidden="true" /></div>
            <h3>Quick Actions</h3>
          </div>
          <div className="card-content">
            <div className="quick-actions">
              <Link to="/app/evaluations" className="btn btn-primary">
                Open Evaluations
              </Link>
              <Link to="/app/reports" className="btn btn-secondary">
                View Reports
              </Link>
              <Link to="/app/placements" className="btn btn-secondary">
                Review Placements
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcademicDashboard;