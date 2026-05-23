import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiClipboard } from 'react-icons/fi';
import { evaluationsAPI, placementsAPI } from '../services/endpoints';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MaskedUserName from '../components/users/MaskedUserName';
import './EvaluationsPage.css';

const FILTERS = ['All', 'Completed', 'Pending', 'In Progress'];

function gradeClass(grade) {
  if (!grade) return 'pending';
  const g = String(grade).toUpperCase();
  if (g.startsWith('A')) return 'A';
  if (g.startsWith('B')) return 'B';
  if (g.startsWith('C')) return 'C';
  return 'D';
}

function scoreColor(score) {
  if (!score) return '#e5e7eb';
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#ff7a00';
  return '#ef4444';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function getEvaluationId(evaluation) {
  return evaluation?.evaluation_id || evaluation?.id || null;
}

function getPlacementId(evaluation) {
  return evaluation?.placement_details?.placement_id
    || evaluation?.placement_details?.id
    || evaluation?.placement?.placement_id
    || evaluation?.placement?.id
    || evaluation?.placement
    || null;
}

function getPlacementTitle(evaluation) {
  return evaluation?.placement_details?.position_title
    || evaluation?.placement?.position_title
    || `Placement #${evaluation?.placement || 'N/A'}`;
}

function getStudentName(placement) {
  return placement?.student_details?.user_details
    ? `${placement.student_details.user_details.first_name || ''} ${placement.student_details.user_details.last_name || ''}`.trim()
    : '—';
}

function EvaluationList() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await evaluationsAPI.getEvaluations();
        setEvaluations(data.results || data || []);
      } catch (err) {
        console.error('Failed to fetch evaluations', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = evaluations.filter((evaluation) => {
    if (activeFilter === 'All') return true;
    const status = evaluation.total_score ? 'Completed' : 'Pending';
    return status === activeFilter;
  });

  const total = evaluations.length;
  const completed = evaluations.filter((evaluation) => evaluation.total_score).length;
  const pending = total - completed;
  const avgScore = completed
    ? Math.round(evaluations.reduce((sum, evaluation) => sum + (Number(evaluation.total_score) || 0), 0) / completed)
    : 0;

  return (
    <div className="evaluations-page">
      <div className="ep-header">
        <div>
          <h1>Evaluations</h1>
          <p>Track final evaluation scores and academic grades</p>
        </div>
      </div>

      <div className="ep-stats">
        {[
          { label: 'Total', value: total },
          { label: 'Completed', value: completed },
          { label: 'Pending', value: pending },
          { label: 'Avg Score', value: completed ? `${avgScore}%` : '—' },
        ].map(({ label, value }) => (
          <div className="ep-stat-card" key={label}>
            <div className="ep-stat-label">{label}</div>
            <div className="ep-stat-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="ep-filters">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            className={`ep-filter-chip${activeFilter === filter ? ' active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading evaluations…" />
      ) : (
        <div className="ep-table-wrapper">
          <table className="ep-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Placement</th>
                <th>Student</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="ep-empty">
                      <FiClipboard size={48} />
                      <p>No evaluations found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((evaluation, index) => {
                  const score = evaluation.total_score ? Number(evaluation.total_score) : null;
                  const status = score ? 'completed' : 'pending';
                  const grade = evaluation.grade || null;
                  const evaluationId = getEvaluationId(evaluation);
                  return (
                    <tr key={evaluationId || index}>
                      <td>{index + 1}</td>
                      <td>
                        {evaluationId ? (
                          <Link
                            to={`/app/evaluations/${evaluationId}`}
                            className="ep-placement-link"
                            aria-label={`View evaluation details for ${getPlacementTitle(evaluation)}`}
                          >
                            <strong>{getPlacementTitle(evaluation)}</strong>
                            <span>View details</span>
                          </Link>
                        ) : (
                          <strong>{getPlacementTitle(evaluation)}</strong>
                        )}
                      </td>
                      <td>
                        <MaskedUserName user={evaluation.placement_details?.student_details?.user_details} fallback="—" />
                      </td>
                      <td>
                        {score !== null ? (
                          <div className="ep-score-bar-wrap">
                            <div className="ep-score-bar-bg">
                              <div
                                className="ep-score-bar-fill"
                                style={{ width: `${Math.min(score, 100)}%`, background: scoreColor(score) }}
                              />
                            </div>
                            <span className="ep-score-text">{score}%</span>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '13px' }}>Not scored</span>
                        )}
                      </td>
                      <td>
                        <span className={`ep-grade ${gradeClass(grade)}`}>
                          {grade || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`ep-status ${status}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EvaluationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const evaluationData = await evaluationsAPI.getEvaluation(id);
        setEvaluation(evaluationData);

        const placementId = getPlacementId(evaluationData);
        if (placementId) {
          try {
            const placementData = await placementsAPI.getPlacement(placementId);
            setPlacement(placementData);
          } catch (placementErr) {
            console.error('Failed to fetch placement details', placementErr);
          }
        }
      } catch (err) {
        console.error('Failed to fetch evaluation details', err);
        setError('Failed to load evaluation details.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch();
  }, [id]);

  if (loading) return <LoadingSpinner text="Loading evaluation details…" fullscreen />;
  if (error) {
    return (
      <div className="evaluations-page">
        <div className="ep-detail-page">
          <button className="ep-back-btn" onClick={() => navigate(-1)}>
            <FiArrowLeft aria-hidden="true" /> Back
          </button>
          <div className="ep-empty ep-detail-empty">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const score = evaluation?.total_score !== null && evaluation?.total_score !== undefined
    ? Number(evaluation.total_score)
    : null;
  const scoreAngle = score !== null ? `${Math.max(0, Math.min(score, 100)) * 3.6}deg` : '0deg';
  const title = getPlacementTitle(evaluation);
  const placementName = placement?.position_title || title;
  const studentName = getStudentName(placement || evaluation?.placement_details);
  const scores = Array.isArray(evaluation?.scores) ? evaluation.scores : [];

  return (
    <div className="evaluations-page">
      <div className="ep-detail-page">
        <button className="ep-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft aria-hidden="true" /> Back to Evaluations
        </button>

        <div className="ep-detail-hero">
          <div>
            <div className="ep-detail-kicker">Evaluation details</div>
            <h1>{placementName}</h1>
            <p>{studentName}</p>
          </div>
          <div className={`ep-status ${score !== null ? 'completed' : 'pending'}`}>
            {score !== null ? 'completed' : 'pending'}
          </div>
        </div>

        <div className="ep-detail-grid">
          <section className="ep-detail-card">
            <h2>Placement Snapshot</h2>
            <div className="ep-detail-list">
              {[
                { label: 'Placement', value: placementName },
                { label: 'Student', value: studentName },
                { label: 'Organization', value: placement?.organization_details?.name || evaluation?.placement_details?.organization_details?.name || '—' },
                { label: 'Start Date', value: formatDate(placement?.start_date || evaluation?.placement_details?.start_date) },
                { label: 'End Date', value: formatDate(placement?.end_date || evaluation?.placement_details?.end_date) },
                { label: 'Placement ID', value: placement?.placement_id || getPlacementId(evaluation) || '—' },
              ].map(({ label, value }) => (
                <div className="ep-detail-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="ep-detail-card">
            <h2>Evaluation Summary</h2>
            <div className="ep-summary-score">
              <div className="ep-score-ring" style={{ '--score-color': scoreColor(score || 0), '--score-angle': scoreAngle }}>
                <span>{score !== null ? `${Math.min(score, 100)}%` : '—'}</span>
              </div>
              <div>
                <div className="ep-detail-row">
                  <span>Grade</span>
                  <strong>{evaluation?.grade || '—'}</strong>
                </div>
                <div className="ep-detail-row">
                  <span>Evaluation Date</span>
                  <strong>{formatDate(evaluation?.evaluation_date)}</strong>
                </div>
                <div className="ep-detail-row">
                  <span>Evaluator</span>
                  <strong>{evaluation?.evaluator_details ? `${evaluation.evaluator_details.first_name || ''} ${evaluation.evaluator_details.last_name || ''}`.trim() : evaluation?.evaluator || '—'}</strong>
                </div>
              </div>
            </div>
            <div className="ep-comments">
              <h3>Comments</h3>
              <p>{evaluation?.comments || 'No comments were provided for this evaluation.'}</p>
            </div>
          </section>
        </div>

        <section className="ep-detail-card">
          <h2>Criteria Scores</h2>
          {scores.length > 0 ? (
            <div className="ep-criteria-list">
              {scores.map((scoreRow) => (
                <article className="ep-criteria-item" key={scoreRow.score_id}>
                  <div className="ep-criteria-head">
                    <div>
                      <h3>{scoreRow.criteria_details?.name || 'Criteria'}</h3>
                      <p>{scoreRow.criteria_details?.description || 'No description available.'}</p>
                    </div>
                    <strong>{Number(scoreRow.score) || 0}/{scoreRow.criteria_details?.max_score || '—'}</strong>
                  </div>
                  <div className="ep-criteria-meta">
                    <span>Weight: {scoreRow.criteria_details?.weight_percentage || '—'}%</span>
                    <span>Max score: {scoreRow.criteria_details?.max_score || '—'}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ep-empty ep-detail-empty">
              <p>No criteria scores are available for this evaluation yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function EvaluationsPage() {
  return (
    <Routes>
      <Route index element={<EvaluationList />} />
      <Route path=":id" element={<EvaluationDetails />} />
    </Routes>
  );
}

export default EvaluationsPage;