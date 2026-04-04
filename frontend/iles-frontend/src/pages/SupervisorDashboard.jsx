import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../hooks/AuthContext';
import { dashboardsAPI, reviewsAPI, placementsAPI, logbooksAPI, evaluationsAPI } from '../services/endpoints';
import './SupervisorDashboard.css';

function SupervisorDashboard() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bootstrapAttempted, setBootstrapAttempted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [reviewsRes, placementsRes, logsRes, evaluationsRes] = await Promise.all([
          reviewsAPI.getReviews(),
          placementsAPI.getPlacements(),
          logbooksAPI.getLogs(),
          evaluationsAPI.getEvaluations(),
        ]);

        let reviewsData = reviewsRes?.results || reviewsRes || [];
        let placementsData = placementsRes?.results || placementsRes || [];
        let logsData = logsRes?.results || logsRes || [];
        let evaluationsData = evaluationsRes?.results || evaluationsRes || [];

        let context = null;
        try {
          context = await dashboardsAPI.getMyDataContext();
        } catch (ctxError) {
          console.warn('Failed to load backend data context:', ctxError);
        }

        const roleName = String(context?.role_name || '').toLowerCase();
        const shouldBootstrap =
          !bootstrapAttempted &&
          context &&
          roleName.includes('supervisor') &&
          context.has_supervisor_profile &&
          (context.supervisor_owned?.placements_workplace || 0) + (context.supervisor_owned?.placements_academic || 0) === 0 &&
          (context.supervisor_owned?.reviews || 0) === 0 &&
          (context.supervisor_owned?.pending_logs || 0) === 0;

        if (shouldBootstrap) {
          try {
            await dashboardsAPI.bootstrapMySupervisorData();
            setBootstrapAttempted(true);

            const [reviewsRefetch, placementsRefetch, logsRefetch] = await Promise.all([
              reviewsAPI.getReviews(),
              placementsAPI.getPlacements(),
              logbooksAPI.getLogs(),
            ]);

            reviewsData = reviewsRefetch?.results || reviewsRefetch || [];
            placementsData = placementsRefetch?.results || placementsRefetch || [];
            logsData = logsRefetch?.results || logsRefetch || [];
            const evalRefetch = await evaluationsAPI.getEvaluations();
            evaluationsData = evalRefetch?.results || evalRefetch || [];
          } catch (bootstrapError) {
            console.warn('Supervisor starter data bootstrap failed:', bootstrapError);
          }
        }

        setReviews(reviewsData);
        setPlacements(placementsData);
        setLogs(logsData);
        setEvaluations(evaluationsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatDate = (value) => {
    if (!value) {
      return 'Date unavailable';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleDateString();
  };

  const getStudentLabel = (placement) => {
    const first = placement?.student_details?.user_details?.first_name || '';
    const last = placement?.student_details?.user_details?.last_name || '';
    const fullName = `${first} ${last}`.trim();
    if (fullName) {
      return fullName;
    }
    return placement?.student_details?.registration_number || 'Unknown student';
  };

  const getPlacementSortDate = (placement) => {
    const value = placement?.created_at || placement?.start_date || placement?.end_date;
    if (!value) {
      return 0;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const getReviewSortDate = (item) => {
    const value = item?.submitted_at || item?.reviewed_at || item?.evaluation_date;
    if (!value) {
      return 0;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const assignedStudents = [...placements]
    .sort((a, b) => getPlacementSortDate(b) - getPlacementSortDate(a))
    .slice(0, 5);

  const pendingLogs = logs
    .filter((log) => log?.status === 'submitted')
    .sort((a, b) => getReviewSortDate(b) - getReviewSortDate(a));

  const recentPendingReviews = pendingLogs.slice(0, 5);

  const completedEvaluations = evaluations.filter((evaluation) => {
    return evaluation && (evaluation.total_score !== null || evaluation.grade || evaluation.evaluation_date);
  });

  const criteriaMap = new Map();
  const evaluationPercentages = [];

  completedEvaluations.forEach((evaluation) => {
    const scores = Array.isArray(evaluation?.scores) ? evaluation.scores : [];
    let evalScoreSum = 0;
    let evalMaxSum = 0;

    scores.forEach((entry, index) => {
      const criteriaId = entry?.criteria_details?.criteria_id || entry?.criteria || `${evaluation.evaluation_id || 'ev'}-${index}`;
      const criteriaName = entry?.criteria_details?.name || `Criteria ${index + 1}`;
      const score = toNumber(entry?.score);
      const maxScore = toNumber(entry?.criteria_details?.max_score);

      const baselineMax = maxScore > 0 ? maxScore : 100;
      const percentage = Math.max(0, Math.min(100, (score / baselineMax) * 100));

      evalScoreSum += score;
      evalMaxSum += baselineMax;

      if (!criteriaMap.has(criteriaId)) {
        criteriaMap.set(criteriaId, {
          criteria: criteriaName,
          percentageTotal: 0,
          count: 0,
        });
      }

      const metric = criteriaMap.get(criteriaId);
      metric.percentageTotal += percentage;
      metric.count += 1;
    });

    if (evalMaxSum > 0) {
      evaluationPercentages.push((evalScoreSum / evalMaxSum) * 100);
    } else if (evaluation?.total_score !== null && evaluation?.total_score !== undefined) {
      evaluationPercentages.push(toNumber(evaluation.total_score));
    }
  });

  const criteriaChartData = Array.from(criteriaMap.values())
    .map((item) => ({
      criteria: item.criteria,
      avgPercentage: Number((item.percentageTotal / Math.max(item.count, 1)).toFixed(1)),
    }))
    .sort((a, b) => b.avgPercentage - a.avgPercentage)
    .slice(0, 8);

  const averageEvaluationPercentage = evaluationPercentages.length
    ? (evaluationPercentages.reduce((sum, value) => sum + value, 0) / evaluationPercentages.length)
    : 0;

  const evaluatedStudents = new Set(completedEvaluations.map((item) => item?.placement).filter(Boolean)).size;

  const pendingReviewsCount = pendingLogs.length;

  const placementsById = new Map(placements.map((placement) => [placement?.placement_id, placement]));

  const recentActivity = [
    ...recentPendingReviews.map((log) => ({
      id: `pending-${log.log_id || log.id}`,
      title: `Pending review: Week ${log.week_number || 'N/A'}`,
      subtitle: getStudentLabel(log?.placement_details || placementsById.get(log?.placement)),
      date: log.submitted_at,
      status: 'pending',
      link: '/app/reviews',
    })),
    ...reviews.map((review) => ({
      id: `review-${review.review_id || review.id}`,
      title: `Review ${String(review.review_id || review.id || '').slice(0, 8)} updated`,
      subtitle: `Status: ${(review.status || 'unknown').replace('_', ' ')}`,
      date: review.reviewed_at,
      status: review.status || 'approved',
      link: '/app/reviews',
    })),
    ...completedEvaluations.map((evaluation) => {
      const placement = placementsById.get(evaluation?.placement);
      return {
        id: `evaluation-${evaluation.evaluation_id || evaluation.id}`,
        title: 'Evaluation completed',
        subtitle: getStudentLabel(placement),
        date: evaluation.evaluation_date,
        status: 'approved',
        link: '/app/reports',
      };
    }),
  ]
    .sort((a, b) => getReviewSortDate(b) - getReviewSortDate(a))
    .slice(0, 5);

  const downloadFullReport = () => {
    const headers = [
      'Evaluation ID',
      'Student',
      'Placement ID',
      'Evaluation Date',
      'Total Score',
      'Grade',
    ];

    const escapeCsv = (value) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const rows = completedEvaluations.map((evaluation) => {
      const placement = placementsById.get(evaluation?.placement);
      return [
        evaluation?.evaluation_id || evaluation?.id || '',
        getStudentLabel(placement),
        evaluation?.placement || '',
        evaluation?.evaluation_date || '',
        evaluation?.total_score ?? '',
        evaluation?.grade || '',
      ].map(escapeCsv).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supervisor-evaluation-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="loading-container">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="error-container" style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
        <h2>⚠️ Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="supervisor-dashboard">
      <header className="dashboard-header">
        <h1>Supervisor Dashboard</h1>
        <p>Welcome back! {user?.first_name} {user?.last_name}</p>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card stat-card">
          <h3>Assigned Students</h3>
          <Link to="/app/placements" className="stat-link" aria-label="View all assigned students">
            <div className="stat-number">{placements.length}</div>
          </Link>
          <p>Students currently assigned to you</p>

          <ul className="activity-list compact-list">
            {assignedStudents.length > 0 ? assignedStudents.map((placement) => (
              <li key={placement.placement_id || placement.id}>
                <div className="activity-details">
                  <strong>{getStudentLabel(placement)}</strong>
                  <span>{placement.position_title || 'Internship placement'}</span>
                </div>
              </li>
            )) : (
              <li>
                <div className="activity-details">
                  <span className="no-data-inline">No assigned students yet</span>
                </div>
              </li>
            )}
          </ul>

          <Link to="/app/placements" className="btn-link">
            View All Students →
          </Link>
        </div>

        <div className="dashboard-card stat-card">
          <h3>Pending Reviews</h3>
          <Link to="/app/reviews" className="stat-link" aria-label="Go to pending reviews">
            <div className="stat-number">{pendingReviewsCount}</div>
          </Link>
          <p>Submitted logs waiting for your review</p>

          <ul className="activity-list compact-list">
            {recentPendingReviews.length > 0 ? recentPendingReviews.map((log) => {
              const placement = placementsById.get(log?.placement);
              return (
                <li key={log.log_id || log.id}>
                  <div className="activity-details">
                    <strong>{getStudentLabel(placement)}</strong>
                    <span>Week {log.week_number || 'N/A'} • {formatDate(log.submitted_at)}</span>
                  </div>
                </li>
              );
            }) : (
              <li>
                <div className="activity-details">
                  <span className="no-data-inline">No pending reviews</span>
                </div>
              </li>
            )}
          </ul>

          <Link to="/app/reviews" className="btn-link">
            View All Reviews →
          </Link>
        </div>

        <div className="dashboard-card chart-card">
          <h3>Completed Evaluations</h3>
          <Link to="/app/reports" className="stat-link" aria-label="Open evaluation summaries">
            <div className="stat-number">{completedEvaluations.length}</div>
          </Link>
          <p>Click to view summaries and full evaluation analytics</p>

          <div className="evaluation-overview">
            <div className="overview-pill">
              <span>Average score</span>
              <strong>{averageEvaluationPercentage.toFixed(1)}%</strong>
            </div>
            <div className="overview-pill">
              <span>Evaluated students</span>
              <strong>{evaluatedStudents}</strong>
            </div>
          </div>

          <h4 className="chart-subtitle">Average Score by Criteria (%)</h4>
          {criteriaChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={criteriaChartData} layout="vertical" margin={{ left: 12, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis dataKey="criteria" type="category" width={130} />
                <Tooltip />
                <Bar dataKey="avgPercentage" fill="#f97316" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No completed evaluation data available</p>
          )}

          <div className="card-actions-row">
            <Link to="/app/reports" className="btn btn-secondary">
              View Summaries
            </Link>
            <button type="button" onClick={downloadFullReport} className="btn btn-primary">
              Download Full Report
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <ul className="activity-list">
              {recentActivity.map((item) => (
                <li key={item.id}>
                  <div className="activity-details">
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                    <span>{formatDate(item.date)}</span>
                    <span className={`status-badge status-${item.status}`}>
                      {String(item.status).replace('_', ' ')}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No recent activity</p>
          )}
          <Link to="/app/activities" className="btn-link">
            View All Activities →
          </Link>
        </div>

        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <Link to="/app/placements" className="btn btn-secondary">
              View My Students
            </Link>
            <Link to="/app/reviews" className="btn btn-primary">
              Review Submissions
            </Link>
            <Link to="/app/reports" className="btn btn-secondary">
              Generate Report
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupervisorDashboard;