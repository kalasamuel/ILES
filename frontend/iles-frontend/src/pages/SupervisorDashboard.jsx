import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../hooks/AuthContext';
import { dashboardsAPI, reviewsAPI, placementsAPI, logbooksAPI, evaluationsAPI } from '../services/endpoints';
import './SupervisorDashboard.css';

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortByDateDesc(leftValue, rightValue) {
  return (toDate(rightValue)?.getTime() || 0) - (toDate(leftValue)?.getTime() || 0);
}

function formatDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString() : 'Date unavailable';
}

function getStudentLabel(placement) {
  const first = placement?.student_details?.user_details?.first_name || '';
  const last = placement?.student_details?.user_details?.last_name || '';
  const fullName = `${first} ${last}`.trim();
  if (fullName) return fullName;
  return placement?.student_details?.registration_number || 'Unknown student';
}

function getPlacementIdFromLog(log) {
  return log?.placement?.placement_id || log?.placement || null;
}

function getPlacementDate(placement) {
  return placement?.created_at || placement?.start_date || placement?.end_date || null;
}

function getReviewDate(item) {
  return item?.submitted_at || item?.reviewed_at || item?.evaluation_date || null;
}

function getEvaluationPercentage(evaluation) {
  const scores = Array.isArray(evaluation?.scores) ? evaluation.scores : [];
  let scoreSum = 0;
  let maxSum = 0;

  scores.forEach((entry) => {
    const score = Number(entry?.score) || 0;
    const maxScore = Number(entry?.criteria_details?.max_score) || 100;
    scoreSum += score;
    maxSum += maxScore;
  });

  if (maxSum > 0) {
    return (scoreSum / maxSum) * 100;
  }

  return Number(evaluation?.total_score) || 0;
}

function getEvaluationDisplayScore(evaluation) {
  const score = Number(evaluation?.total_score);
  if (Number.isFinite(score) && score > 0) {
    return Math.min(score, 100);
  }

  return getEvaluationPercentage(evaluation);
}

function getGradeBucket(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getPlacementId(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    return value.placement_id || value.id || null;
  }
  return value;
}

function SupervisorDashboard() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [scoreBreakdowns, setScoreBreakdowns] = useState([]);
  const [criteriaSummaries, setCriteriaSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const bootstrapAttemptedRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);

        try {
          await evaluationsAPI.recalculateMySummaries();
        } catch (recalcError) {
          console.warn('Failed to recalculate evaluation summaries:', recalcError);
        }

        const [reviewsRes, placementsRes, logsRes, evaluationsRes, scoreBreakdownsRes, criteriaSummariesRes] = await Promise.all([
          reviewsAPI.getReviews(),
          placementsAPI.getPlacements(),
          logbooksAPI.getLogs(),
          evaluationsAPI.getEvaluations(),
          evaluationsAPI.getScoreBreakdowns(),
          dashboardsAPI.getEvaluationCriteriaSummaries(),
        ]);

        let reviewsData = reviewsRes?.results || reviewsRes || [];
        let placementsData = placementsRes?.results || placementsRes || [];
        let logsData = logsRes?.results || logsRes || [];
        let evaluationsData = evaluationsRes?.results || evaluationsRes || [];
        let scoreBreakdownsData = scoreBreakdownsRes?.results || scoreBreakdownsRes || [];
        let criteriaSummariesData = criteriaSummariesRes?.criteria_summaries || [];

        let context = null;
        try {
          context = await dashboardsAPI.getMyDataContext();
        } catch (ctxError) {
          console.warn('Failed to load dashboard context:', ctxError);
        }

        const roleName = String(context?.role_name || '').toLowerCase();
        const shouldBootstrap =
          !bootstrapAttemptedRef.current &&
          context &&
          roleName.includes('supervisor') &&
          context.has_supervisor_profile &&
          (context.supervisor_owned?.placements_workplace || 0) + (context.supervisor_owned?.placements_academic || 0) === 0 &&
          (context.supervisor_owned?.reviews || 0) === 0 &&
          (context.supervisor_owned?.pending_logs || 0) === 0;

        if (shouldBootstrap) {
          try {
            await dashboardsAPI.bootstrapMySupervisorData();
            bootstrapAttemptedRef.current = true;

            const [reviewsRefetch, placementsRefetch, logsRefetch, evaluationsRefetch, scoreBreakdownsRefetch, criteriaSummariesRefetch] = await Promise.all([
              reviewsAPI.getReviews(),
              placementsAPI.getPlacements(),
              logbooksAPI.getLogs(),
              evaluationsAPI.getEvaluations(),
              evaluationsAPI.getScoreBreakdowns(),
              dashboardsAPI.getEvaluationCriteriaSummaries(),
            ]);

            reviewsData = reviewsRefetch?.results || reviewsRefetch || [];
            placementsData = placementsRefetch?.results || placementsRefetch || [];
            logsData = logsRefetch?.results || logsRefetch || [];
            evaluationsData = evaluationsRefetch?.results || evaluationsRefetch || [];
            scoreBreakdownsData = scoreBreakdownsRefetch?.results || scoreBreakdownsRefetch || [];
            criteriaSummariesData = criteriaSummariesRefetch?.criteria_summaries || [];
          } catch (bootstrapError) {
            console.warn('Supervisor starter data bootstrap failed:', bootstrapError);
          }
        }

        setReviews(reviewsData);
        setPlacements(placementsData);
        setLogs(logsData);
        setEvaluations(evaluationsData);
        setScoreBreakdowns(scoreBreakdownsData);
        setCriteriaSummaries(criteriaSummariesData);
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
    () => new Map(placements.map((placement) => [placement?.placement_id, placement])),
    [placements]
  );

  const activeStudents = useMemo(() => {
    const uniqueStudents = new Map();
    placements.forEach((placement) => {
      const studentId = placement?.student_details?.student_id || placement?.student || placement?.student_details?.user_details?.user_id;
      if (studentId && !uniqueStudents.has(String(studentId))) {
        uniqueStudents.set(String(studentId), placement);
      }
    });

    return Array.from(uniqueStudents.values())
      .sort((left, right) => sortByDateDesc(getPlacementDate(left), getPlacementDate(right)));
  }, [placements]);

  const assignedStudents = activeStudents.slice(0, 5);

  const pendingReviews = useMemo(() => {
    return [...logs]
      .filter((log) => String(log?.status || '').toLowerCase() === 'submitted')
      .sort((left, right) => sortByDateDesc(getReviewDate(left), getReviewDate(right)));
  }, [logs]);

  const recentPendingReviews = pendingReviews.slice(0, 5);

  const completedEvaluations = useMemo(() => {
    return [...evaluations].filter((evaluation) => {
      return evaluation && (evaluation.total_score !== null || evaluation.grade || evaluation.evaluation_date || Array.isArray(evaluation.scores));
    });
  }, [evaluations]);

  const completedScoreBreakdowns = useMemo(() => {
    return [...scoreBreakdowns].filter((breakdown) => {
      const score = Number(breakdown?.final_score);
      return Number.isFinite(score) || breakdown?.grade;
    });
  }, [scoreBreakdowns]);

  const completedEvaluationCount = completedScoreBreakdowns.length || completedEvaluations.length;

  const criteriaChartData = useMemo(() => {
    return [...criteriaSummaries]
      .map((item) => ({
        criteria: item.criteria,
        avgPercentage: Number(item.avgPercentage || 0),
      }))
      .sort((left, right) => right.avgPercentage - left.avgPercentage)
      .slice(0, 8);
  }, [criteriaSummaries]);

  const completedScoreTrend = useMemo(() => {
    const source = completedScoreBreakdowns.length > 0
      ? completedScoreBreakdowns.map((breakdown) => {
          const placementId = getPlacementId(breakdown?.placement);
          const placement = placementsById.get(placementId);
          const score = Number(breakdown?.final_score);
          const normalized = Number.isFinite(score) ? score : 0;
          return {
            evaluation_date: placement?.end_date || placement?.start_date || null,
            score: Number(normalized.toFixed(1)),
            grade: breakdown?.grade || getGradeBucket(normalized),
          };
        })
      : completedEvaluations.map((evaluation) => {
          const score = getEvaluationDisplayScore(evaluation);
          return {
            evaluation_date: evaluation?.evaluation_date,
            score: Number(score.toFixed(1)),
            grade: evaluation?.grade || getGradeBucket(score),
          };
        });

    return source
      .sort((left, right) => sortByDateDesc(left?.evaluation_date, right?.evaluation_date))
      .slice(0, 6)
      .map((evaluation, index) => ({
        label: `#${index + 1}`,
        score: Number(evaluation.score || 0),
        grade: evaluation?.grade || getGradeBucket(Number(evaluation.score || 0)),
      }))
      .reverse();
  }, [completedScoreBreakdowns, completedEvaluations, placementsById]);

  const gradeDistribution = useMemo(() => {
    const buckets = [
      { grade: 'A', count: 0 },
      { grade: 'B', count: 0 },
      { grade: 'C', count: 0 },
      { grade: 'D', count: 0 },
      { grade: 'F', count: 0 },
    ];

    const source = completedScoreBreakdowns.length > 0
      ? completedScoreBreakdowns.map((breakdown) => ({
          score: Number(breakdown?.final_score) || 0,
          grade: breakdown?.grade,
        }))
      : completedEvaluations.map((evaluation) => ({
          score: getEvaluationDisplayScore(evaluation),
          grade: evaluation?.grade,
        }));

    source.forEach((evaluation) => {
      const score = Number(evaluation.score || 0);
      const grade = String(evaluation?.grade || getGradeBucket(score)).toUpperCase().slice(0, 1);
      const bucket = buckets.find((item) => item.grade === grade) || buckets[buckets.length - 1];
      bucket.count += 1;
    });

    return buckets.filter((item) => item.count > 0);
  }, [completedScoreBreakdowns, completedEvaluations]);

  const averageEvaluationPercentage = useMemo(() => {
    const percentages = completedScoreBreakdowns.length > 0
      ? completedScoreBreakdowns
          .map((breakdown) => Number(breakdown?.final_score))
          .filter((score) => Number.isFinite(score))
      : completedEvaluations.map((evaluation) => getEvaluationPercentage(evaluation));
    if (percentages.length === 0) return 0;
    return percentages.reduce((sum, value) => sum + value, 0) / percentages.length;
  }, [completedScoreBreakdowns, completedEvaluations]);

  const evaluatedStudents = useMemo(() => {
    const placementIds = completedScoreBreakdowns.length > 0
      ? completedScoreBreakdowns.map((breakdown) => getPlacementId(breakdown?.placement))
      : completedEvaluations.map((evaluation) => getPlacementId(evaluation?.placement));
    return new Set(placementIds.filter(Boolean)).size;
  }, [completedScoreBreakdowns, completedEvaluations]);

  const completionRate = useMemo(() => {
    if (activeStudents.length === 0) return 0;
    return Math.round((evaluatedStudents / activeStudents.length) * 100);
  }, [activeStudents.length, evaluatedStudents]);

  const completedEvaluationRows = useMemo(() => {
    if (completedScoreBreakdowns.length > 0) {
      return completedScoreBreakdowns.slice(0, 4).map((breakdown) => {
        const placement = placementsById.get(getPlacementId(breakdown?.placement));
        const score = Number(breakdown?.final_score);
        const normalized = Number.isFinite(score) ? score : 0;
        return {
          id: breakdown?.score_id || `${getPlacementId(breakdown?.placement)}-${breakdown?.grade || 'grade'}`,
          student: getStudentLabel(placement),
          placementTitle: placement?.position_title || 'Placement',
          date: placement?.end_date || placement?.start_date || null,
          score: normalized,
          grade: breakdown?.grade || getGradeBucket(normalized),
        };
      });
    }

    return completedEvaluations.slice(0, 4).map((evaluation) => {
      const placement = placementsById.get(getPlacementId(evaluation?.placement));
      const score = getEvaluationDisplayScore(evaluation);
      return {
        id: evaluation?.evaluation_id || evaluation?.id,
        student: getStudentLabel(placement),
        placementTitle: placement?.position_title || 'Placement',
        date: evaluation?.evaluation_date,
        score,
        grade: evaluation?.grade || getGradeBucket(score),
      };
    });
  }, [completedScoreBreakdowns, completedEvaluations, placementsById]);

  const recentActivity = useMemo(() => {
    const items = [
      ...recentPendingReviews.map((log) => ({
        id: `pending-${log.log_id || log.id}`,
        title: `Pending review: Week ${log.week_number || 'N/A'}`,
        subtitle: getStudentLabel(placementsById.get(getPlacementIdFromLog(log))),
        date: log.submitted_at,
        status: 'pending',
        link: '/app/reviews',
      })),
      ...reviews.map((review) => ({
        id: `review-${review.review_id || review.id}`,
        title: `Review ${String(review.review_id || review.id || '').slice(0, 8)} updated`,
        subtitle: `Status: ${String(review.status || 'unknown').replace(/_/g, ' ')}`,
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
    ];

    return items.sort((left, right) => sortByDateDesc(left.date, right.date)).slice(0, 5);
  }, [recentPendingReviews, reviews, completedEvaluations, placementsById]);

  const downloadFullReport = () => {
    const escapeCsv = (value) => {
      const text = String(value ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const summaryHeaders = ['Evaluation ID', 'Student', 'Placement ID', 'Evaluation Date', 'Total Score', 'Grade'];
    const summaryRows = completedEvaluations.map((evaluation) => {
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

    const criteriaHeaders = ['Criteria', 'Average Percentage'];
    const criteriaRows = criteriaChartData.map((item) => [item.criteria, item.avgPercentage].map(escapeCsv).join(','));

    const csvContent = [
      'Evaluation Summary',
      summaryHeaders.join(','),
      ...summaryRows,
      '',
      'Criteria Averages',
      criteriaHeaders.join(','),
      ...criteriaRows,
    ].join('\n');

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
        <p>Welcome back, {user?.first_name} {user?.last_name}</p>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card stat-card">
          <h3>Assigned Students</h3>
          <Link to="/app/placements" className="stat-link" aria-label="View all assigned students">
            <div className="stat-number">{activeStudents.length}</div>
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
            <div className="stat-number">{pendingReviews.length}</div>
          </Link>
          <p>Submitted logs waiting for your review</p>

          <ul className="activity-list compact-list">
            {recentPendingReviews.length > 0 ? recentPendingReviews.map((log) => {
              const placement = placementsById.get(getPlacementIdFromLog(log));
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
            <div className="stat-number">{completedEvaluationCount}</div>
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
            <div className="overview-pill">
              <span>Completion rate</span>
              <strong>{`${completionRate}%`}</strong>
            </div>
          </div>

          <h4 className="chart-subtitle">Completed Evaluation Scores</h4>
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
          ) : completedScoreTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={completedScoreTrend} margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} domain={[0, 100]} unit="%" />
                <Tooltip />
                <Bar dataKey="score" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : gradeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gradeDistribution} margin={{ left: 8, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No completed evaluation data available</p>
          )}

          {completedEvaluationRows.length > 0 && (
            <div className="completed-evaluations-list">
              {completedEvaluationRows.map((evaluation) => (
                  <div key={evaluation.id} className="completed-evaluation-row">
                    <div>
                      <strong>{evaluation.student}</strong>
                      <span>{evaluation.placementTitle} • {formatDate(evaluation.date)}</span>
                    </div>
                    <div className="completed-evaluation-score">
                      <span>{evaluation.score.toFixed(1)}%</span>
                      <small>{evaluation.grade}</small>
                    </div>
                  </div>
              ))}
            </div>
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