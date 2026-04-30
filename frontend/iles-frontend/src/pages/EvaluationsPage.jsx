import React, { useEffect, useState } from 'react';
import { FiClipboard } from 'react-icons/fi';
import { evaluationsAPI } from '../services/endpoints';
import LoadingSpinner from '../components/ui/LoadingSpinner';
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
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading]         = useState(true);
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

  const filtered = evaluations.filter((e) => {
    if (activeFilter === 'All') return true;
    const status = e.total_score ? 'Completed' : 'Pending';
    return status === activeFilter;
  });

  const total     = evaluations.length;
  const completed = evaluations.filter((e) => e.total_score).length;
  const pending   = total - completed;
  const avgScore  = completed
    ? Math.round(evaluations.reduce((s, e) => s + (Number(e.total_score) || 0), 0) / completed)
    : 0;

  return (
    <div className="evaluations-page">
      {/* Header */}
      <div className="ep-header">
        <div>
          <h1>Evaluations</h1>
          <p>Track final evaluation scores and academic grades</p>
        </div>
      </div>

      {/* Stats */}
      <div className="ep-stats">
        {[
          { label: 'Total',     value: total },
          { label: 'Completed', value: completed },
          { label: 'Pending',   value: pending },
          { label: 'Avg Score', value: completed ? `${avgScore}%` : '—' },
        ].map(({ label, value }) => (
          <div className="ep-stat-card" key={label}>
            <div className="ep-stat-label">{label}</div>
            <div className="ep-stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="ep-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`ep-filter-chip${activeFilter === f ? ' active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
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
                filtered.map((ev, idx) => {
                  const score  = ev.total_score ? Number(ev.total_score) : null;
                  const status = score ? 'completed' : 'pending';
                  const grade  = ev.grade || null;
                  return (
                    <tr key={ev.evaluation_id || idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{ev.placement_details?.position_title || `Placement #${ev.placement}`}</strong></td>
                      <td>{ev.placement_details?.student_details?.user_details?.first_name || '—'}</td>
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

export default EvaluationsPage;