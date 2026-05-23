import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Legend,
} from 'recharts';
import { useAuth } from '../hooks/AuthContext';
import MaskedUserName from '../components/users/MaskedUserName';
import { dashboardsAPI, reviewsAPI, placementsAPI, logbooksAPI, evaluationsAPI } from '../services/endpoints';
import { exportChartRefAsPNG } from '../utils/chartExport';
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
  const user = placement?.student_details?.user_details || null;
  const reg = placement?.student_details?.registration_number || null;
  if (!user) return reg || 'Unknown student';
  return <MaskedUserName user={user} fallback={reg || 'Unknown student'} />;
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
  const [activeTab, setActiveTab] = useState('academic');
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

        // Debug logging disabled in production builds to reduce console noise
        // eslint-disable-next-line no-console
        // console.debug('SupervisorDashboard raw responses', { reviewsRes, placementsRes, logsRes, evaluationsRes, scoreBreakdownsRes, criteriaSummariesRes });

        let reviewsData = reviewsRes?.results || reviewsRes || [];
        let placementsData = placementsRes?.results || placementsRes || [];
        let logsData = logsRes?.results || logsRes || [];
        let evaluationsData = evaluationsRes?.results || evaluationsRes || [];
        let scoreBreakdownsData = scoreBreakdownsRes?.results || scoreBreakdownsRes || [];
        let criteriaSummariesData = criteriaSummariesRes?.criteria_summaries || [];

        // Removed automatic supervisor bootstrap behavior to prevent unexpected
        // generation of starter data. Dashboard shows only existing user data.

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

  // Helper: determine if a placement belongs to the current active tab (academic/workplace)
  function placementMatchesTab(placement, tab) {
    if (!placement) return false;
    try {
      const acad = placement?.academic_supervisor_details || placement?.academic_supervisor || placement?.academic_supervisor_id || null;
      const work = placement?.workplace_supervisor_details || placement?.workplace_supervisor || placement?.workplace_supervisor_id || null;

      const userId = user?.user_id || user?.id || null;

      if (tab === 'academic') {
        if (!acad) return false;
        // acad may be an object with user_details.user_id or supervisor_id
        if (typeof acad === 'object') {
          const aUserId = acad?.user_details?.user_id || acad?.user?.user_id || acad?.user_id || acad?.supervisor_id || acad?.id || null;
          return String(aUserId) === String(userId);
        }
        return String(acad) === String(userId) || String(acad) === String(user?.supervisor?.supervisor_id || user?.supervisor_id || user?.id);
      }

      if (tab === 'workplace') {
        if (!work) return false;
        if (typeof work === 'object') {
          const wUserId = work?.user_details?.user_id || work?.user?.user_id || work?.user_id || work?.supervisor_id || work?.id || null;
          return String(wUserId) === String(userId);
        }
        return String(work) === String(userId) || String(work) === String(user?.supervisor?.supervisor_id || user?.supervisor_id || user?.id);
      }

      return true;
    } catch (err) {
      return false;
    }
  }

  const visiblePlacements = useMemo(() => placements.filter((p) => placementMatchesTab(p, activeTab)), [placements, activeTab, user]);

  const visiblePlacementIds = useMemo(() => new Set(visiblePlacements.map((p) => getPlacementId(p) || p?.placement_id)), [visiblePlacements]);

  const activeStudents = useMemo(() => {
    const uniqueStudents = new Map();
    visiblePlacements.forEach((placement) => {
      const studentId = placement?.student_details?.student_id || placement?.student || placement?.student_details?.user_details?.user_id;
      if (studentId && !uniqueStudents.has(String(studentId))) {
        uniqueStudents.set(String(studentId), placement);
      }
    });

    return Array.from(uniqueStudents.values())
      .sort((left, right) => sortByDateDesc(getPlacementDate(left), getPlacementDate(right)));
  }, [visiblePlacements]);

  const assignedStudents = activeStudents.slice(0, 5);

  const pendingReviews = useMemo(() => {
    return [...logs]
      .filter((log) => String(log?.status || '').toLowerCase() === 'submitted')
      .filter((log) => {
        const pid = getPlacementIdFromLog(log);
        if (!pid) return true;
        return visiblePlacementIds.size === 0 || visiblePlacementIds.has(String(pid));
      })
      .sort((left, right) => sortByDateDesc(getReviewDate(left), getReviewDate(right)));
  }, [logs, visiblePlacementIds]);

  const recentPendingReviews = pendingReviews.slice(0, 5);

  const completedEvaluations = useMemo(() => {
    return [...evaluations].filter((evaluation) => {
      const ok = evaluation && (evaluation.total_score !== null || evaluation.grade || evaluation.evaluation_date || Array.isArray(evaluation.scores));
      if (!ok) return false;
      const pid = getPlacementId(evaluation?.placement);
      if (!pid) return ok;
      return visiblePlacementIds.size === 0 || visiblePlacementIds.has(String(pid));
    });
  }, [evaluations, visiblePlacementIds]);

  const completedScoreBreakdowns = useMemo(() => {
    return [...scoreBreakdowns].filter((breakdown) => {
      const score = Number(breakdown?.final_score);
      const ok = Number.isFinite(score) || breakdown?.grade;
      if (!ok) return false;
      const pid = getPlacementId(breakdown?.placement);
      if (!pid) return ok;
      return visiblePlacementIds.size === 0 || visiblePlacementIds.has(String(pid));
    });
  }, [scoreBreakdowns, visiblePlacementIds]);

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

  // Chart colors (use project orange palette)
  const primaryColor = '#ff7a00';
  const primaryShade = '#ff7a00';
  const neutralBg = '#ffffff';

  const navigate = useNavigate();

  // Refs for exporting charts
  const trendRef = useRef(null);
  const radarRef = useRef(null);
  const pieRef = useRef(null);
  const heatmapRef = useRef(null);
  const histRef = useRef(null);

  // Filters state
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterStudent, setFilterStudent] = useState('');

  function CustomChartTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0];
    return (
      <div className="custom-tooltip" style={{ padding: 10, background: '#fff', border: '1px solid #eee', borderRadius: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{p.name || p.dataKey}: <strong style={{ color: primaryColor }}>{p.value}{p.unit || ''}</strong></div>
      </div>
    );
  }

  function ScoreTrendArea({ data }) {
    if (!data || data.length === 0) return <div className="no-data">No trend data</div>;
    return (
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ left: 0, right: 12 }} onClick={(e) => handleTrendClick(e)}>
          <defs>
            <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryShade} stopOpacity={0.9} />
              <stop offset="100%" stopColor={primaryShade} stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="label" tick={{ fill: '#6b7280' }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#6b7280' }} />
          <Tooltip content={<CustomChartTooltip />} />
          <Area type="monotone" dataKey="score" stroke={primaryColor} fill="url(#gradScore)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  function handleTrendClick(e) {
    try {
      const payload = e?.activePayload && e.activePayload[0] && e.activePayload[0].payload;
      if (payload && payload.label) {
        navigate(`/app/reports?label=${encodeURIComponent(String(payload.label))}`);
      }
    } catch (err) {
      // no-op
    }
  }

  function CriteriaRadar({ data }) {
    if (!data || data.length === 0) return <div className="no-data">No criteria data</div>;
    // Radar needs value name and subject
    const radarData = data.map((d) => ({ subject: d.criteria, A: d.avgPercentage }));
    return (
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={radarData} outerRadius={70} margin={{ top: 10, right: 8, left: 8, bottom: 10 }} onClick={(e) => handleRadarClick(e)}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Radar name="Avg" dataKey="A" stroke={primaryColor} fill={primaryColor} fillOpacity={0.18} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  function handleRadarClick(e) {
    try {
      const payload = e?.activePayload && e.activePayload[0] && e.activePayload[0].payload;
      if (payload && (payload.subject || payload.criteria)) {
        const subject = payload.subject || payload.criteria;
        navigate(`/app/reports?criteria=${encodeURIComponent(String(subject))}`);
      }
    } catch (err) {
      // no-op
    }
  }

  function GradePie({ data }) {
    if (!data || data.length === 0) return <div className="no-data">No grade distribution</div>;
    const colors = ['#ff7a00', '#ff7a00', '#ff7a00', '#ff7a00', '#ff7a00'];
    return (
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="grade" cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={4} label={({ grade, percent }) => `${grade} (${Math.round(percent * 100)}%)`} onClick={(entry, index) => handlePieClick(entry, index)}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  function handlePieClick(entry) {
    try {
      const grade = entry && (entry.grade || entry.payload?.grade);
      if (grade) navigate(`/app/reports?grade=${encodeURIComponent(String(grade))}`);
    } catch (err) {
      // no-op
    }
  }

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

  // Apply UI filters to chart datasets
  const filteredScoreTrend = useMemo(() => {
    const source = completedScoreBreakdowns.length > 0 ? completedScoreBreakdowns : completedEvaluations;
    const filtered = source.filter((item) => {
      try {
        const placementId = getPlacementId(item?.placement);
        const placement = placementsById.get(placementId) || {};

        if (filterStudent) {
          const sid = placement?.student_details?.student_id || placement?.student || placement?.student_details?.user_details?.user_id;
          if (!sid || String(sid) !== String(filterStudent)) return false;
        }

        if (filterStart || filterEnd) {
          const dateStr = item?.evaluation_date || placement?.end_date || placement?.start_date || item?.submitted_at || null;
          const d = toDate(dateStr);
          if (!d) return false;
          if (filterStart) {
            const s = new Date(filterStart);
            if (d < s) return false;
          }
          if (filterEnd) {
            const e = new Date(filterEnd);
            if (d > e) return false;
          }
        }

        return true;
      } catch (err) {
        return true;
      }
    });

    // Map to the same format as completedScoreTrend
    const base = filtered.length > 0
      ? filtered.map((breakdown) => {
          const placementId = getPlacementId(breakdown?.placement);
          const placement = placementsById.get(placementId) || {};
          const score = Number(breakdown?.final_score) || getEvaluationDisplayScore(breakdown) || 0;
          const normalized = Number.isFinite(score) ? score : 0;
          return {
            evaluation_date: placement?.end_date || placement?.start_date || breakdown?.evaluation_date || null,
            score: Number(normalized.toFixed(1)),
            grade: breakdown?.grade || getGradeBucket(normalized),
          };
        })
      : [];

    const mapped = base
      .sort((left, right) => sortByDateDesc(left?.evaluation_date, right?.evaluation_date))
      .slice(0, 6)
      .map((evaluation, index) => ({ label: `#${index + 1}`, score: Number(evaluation.score || 0), grade: evaluation?.grade || getGradeBucket(Number(evaluation.score || 0)) }))
      .reverse();

    return mapped;
  }, [completedScoreBreakdowns, completedEvaluations, placementsById, filterStart, filterEnd, filterStudent]);

  const filteredCriteriaChartData = useMemo(() => {
    if (!criteriaChartData || criteriaChartData.length === 0) return criteriaChartData;
    // criteria averages are less affected by student/date filters here; return as-is for now
    return criteriaChartData;
  }, [criteriaChartData, filterStart, filterEnd, filterStudent]);

  const filteredGradeDistribution = useMemo(() => {
    if (!gradeDistribution || gradeDistribution.length === 0) return gradeDistribution;
    // simple student/date filtering not applied to aggregated buckets here
    return gradeDistribution;
  }, [gradeDistribution, filterStart, filterEnd, filterStudent]);

  // Extra charts: counts per placement (stacked/columns) and score buckets
  const placementCounts = useMemo(() => {
    const map = new Map();
    const source = completedScoreBreakdowns.length > 0 ? completedScoreBreakdowns : completedEvaluations;
    source.forEach((item) => {
      const pid = getPlacementId(item?.placement) || 'unknown';
      const placement = placementsById.get(pid) || { placement_id: pid, position_title: 'Unknown' };
      const title = placement.position_title || String(pid).slice(0, 8);
      const entry = map.get(title) || 0;
      map.set(title, entry + 1);
    });
    return Array.from(map.entries()).map(([placementTitle, count]) => ({ placementTitle, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [completedScoreBreakdowns, completedEvaluations, placementsById]);

  const scoreBuckets = useMemo(() => {
    const buckets = [0,0,0,0,0];
    const source = completedScoreBreakdowns.length > 0 ? completedScoreBreakdowns : completedEvaluations;
    source.forEach((item) => {
      const score = Number(item?.final_score ?? getEvaluationDisplayScore(item)) || 0;
      if (score >= 90) buckets[0] += 1;
      else if (score >= 80) buckets[1] += 1;
      else if (score >= 70) buckets[2] += 1;
      else if (score >= 60) buckets[3] += 1;
      else buckets[4] += 1;
    });
    return [
      { name: 'A (90+)', value: buckets[0] },
      { name: 'B (80-89)', value: buckets[1] },
      { name: 'C (70-79)', value: buckets[2] },
      { name: 'D (60-69)', value: buckets[3] },
      { name: 'F (<60)', value: buckets[4] },
    ];
  }, [completedScoreBreakdowns, completedEvaluations]);

  // Activity heatmap: weekday (0 Sun - 6 Sat) by hour (0-23)
  const activityHeatmap = useMemo(() => {
    const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    const sources = [ ...logs || [], ...reviews || [], ...(completedEvaluations || []), ...(completedScoreBreakdowns || []) ];
    sources.forEach((item) => {
      const dateStr = item?.submitted_at || item?.reviewed_at || item?.evaluation_date || item?.created_at || item?.timestamp || null;
      const d = toDate(dateStr);
      if (!d) return;
      const day = d.getDay();
      const hour = d.getHours();
      matrix[day][hour] = (matrix[day][hour] || 0) + 1;
    });
    let max = 0;
    matrix.forEach((row) => row.forEach((v) => { if (v > max) max = v; }));
    return { matrix, max };
  }, [logs, reviews, completedEvaluations, completedScoreBreakdowns]);

  // Score distribution histogram (10 buckets)
  const scoreHistogram = useMemo(() => {
    const bins = Array.from({ length: 10 }, () => 0);
    const source = completedScoreBreakdowns.length > 0 ? completedScoreBreakdowns : completedEvaluations;
    source.forEach((item) => {
      const score = Number(item?.final_score ?? getEvaluationDisplayScore(item)) || 0;
      const idx = Math.min(9, Math.floor(score / 10));
      bins[idx] += 1;
    });
    return bins.map((count, i) => ({ range: `${i*10}-${i===9?100:i*10+9}`, count }));
  }, [completedScoreBreakdowns, completedEvaluations]);

  function Heatmap({ data }) {
    if (!data) return <div className="no-data">No activity data</div>;
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const { matrix, max } = data;
    return (
      <div className="heatmap-shell" ref={heatmapRef}>
        <div className="heatmap-grid">
          {days.map((day, r) => (
            <div key={day} className="heatmap-row" aria-label={day}>
              <div className="heatmap-day-label">{day}</div>
              <div className="heatmap-cells">
                {matrix[r].map((val, h) => {
                  const intensity = max > 0 ? (val / max) : 0;
                  const bg = `rgba(255,122,0,${0.06 + intensity * 0.9})`;
                  return (
                    <div
                      key={`${r}-${h}`}
                      role="button"
                      tabIndex={0}
                      className="heatmap-cell"
                      title={`${day} ${h}:00 — ${val} events`}
                      style={{ background: bg }}
                      onClick={() => navigate(`/app/reports?weekday=${r}&hour=${h}`)}
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
    if (!data || data.length === 0) return <div className="no-data">No scores</div>;
    return (
      <ResponsiveContainer width="100%" height={160} ref={histRef}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="range" tick={{ fill: '#6b7280' }} />
          <YAxis allowDecimals={false} tick={{ fill: '#6b7280' }} />
          <Tooltip />
          <Bar dataKey="count" fill={primaryColor} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

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

          <h4 className="chart-subtitle">Evaluation Analytics</h4>
          <div className="filter-row">
            <label style={{fontSize:12, color:'#6b7280'}}>From</label>
            <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
            <label style={{fontSize:12, color:'#6b7280'}}>To</label>
            <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
            <label style={{fontSize:12, color:'#6b7280'}}>Student</label>
            <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
              <option value="">All students</option>
              {activeStudents.map((pl) => {
                const sid = pl?.student_details?.student_id || pl?.student || pl?.student_details?.user_details?.user_id;
                return <option key={sid} value={sid}>{getStudentLabel(pl)}</option>;
              })}
            </select>
            <button className="btn btn-secondary" onClick={() => { setFilterStart(''); setFilterEnd(''); setFilterStudent(''); }}>Reset</button>
          </div>

          <div className="advanced-charts-grid">
            <div style={{gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between'}}>
              <div style={{display:'flex', gap:8}}>
                <button className={`btn ${activeTab==='academic' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('academic')}>Academic Supervisor</button>
                <button className={`btn ${activeTab==='workplace' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('workplace')}>Workplace Supervisor</button>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button className="btn btn-secondary" onClick={() => exportChartRefAsPNG(null, 'dashboard-snapshot.png')}>Export Dashboard</button>
              </div>
            </div>

            <div className="chart-panel chart-panel--trend" ref={trendRef}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                <h5 className="small-title">Score Trend</h5>
                <div className="panel-actions">
                  <button className="btn btn-secondary" onClick={() => exportChartRefAsPNG(trendRef, 'score-trend.png')}>Export PNG</button>
                </div>
              </div>
              <ScoreTrendArea data={filteredScoreTrend.length>0 ? filteredScoreTrend : completedScoreTrend} />
            </div>

            <div className="chart-panel chart-panel--radar" ref={radarRef}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                <h5 className="small-title">Criteria Averages</h5>
                <div className="panel-actions">
                  <button className="btn btn-secondary" onClick={() => exportChartRefAsPNG(radarRef, 'criteria-averages.png')}>Export PNG</button>
                </div>
              </div>
              <CriteriaRadar data={filteredCriteriaChartData} />
            </div>

            <div className="chart-panel chart-panel--pie" ref={pieRef}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                <h5 className="small-title">Grade Distribution</h5>
                <div className="panel-actions">
                  <button className="btn btn-secondary" onClick={() => exportChartRefAsPNG(pieRef, 'grade-distribution.png')}>Export PNG</button>
                </div>
              </div>
              <GradePie data={filteredGradeDistribution} />
            </div>

            <div className="chart-panel chart-panel--stacked" style={{gridColumn: '1 / -1'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <h5 className="small-title">Top Placements (by evaluations)</h5>
                <div className="panel-actions">
                  <button className="btn btn-secondary" onClick={() => exportChartRefAsPNG(null, 'placements-counts.png')}>Export PNG</button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={placementCounts} layout="vertical" margin={{left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fill: '#6b7280' }} />
                  <YAxis dataKey="placementTitle" type="category" width={200} tick={{ fill: '#6b7280' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={primaryColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-panel chart-panel--heatmap" style={{gridColumn: '1 / 3'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <h5 className="small-title">Activity Heatmap</h5>
                <div className="panel-actions">
                  <button className="btn btn-secondary" onClick={() => exportChartRefAsPNG(heatmapRef, 'activity-heatmap.png')}>Export PNG</button>
                </div>
              </div>
              <Heatmap data={activityHeatmap} />
            </div>

            {/* Score distribution moved out of the chart grid to sit as its own dashboard card */}
          </div>

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
        {/* Score Distribution as its own card so it can sit beside Quick Actions */}
        <div className="dashboard-card">
          <h3>Score Distribution</h3>
          <div style={{marginTop:8}}>
            <ScoreHistogram data={scoreHistogram} />
          </div>
          <div style={{marginTop:10}}>
            <button className="btn btn-secondary" onClick={() => exportChartRefAsPNG(histRef, 'score-distribution.png')}>Export PNG</button>
            <Link to="/app/reports" className="btn-link" style={{marginLeft:8}}>View Full Report →</Link>
          </div>
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