import React, { useEffect, useState } from 'react';
import { Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
import { logbooksAPI } from '../services/endpoints';
import WeeklyLogForm from './WeeklyLogForm';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './LogsPage.css';

const STATUS_FILTERS = ['All', 'Draft', 'Submitted', 'Reviewed', 'Approved', 'Rejected'];

// ── Log List ──────────────────────────────────────────────────────────────
function LogList() {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeFilter, setFilter]   = useState('All');

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await logbooksAPI.getLogs();
        setLogs(data.results || data || []);
      } catch (err) {
        console.error('Failed to fetch logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = logs.filter((l) => {
    if (activeFilter === 'All') return true;
    return l.status?.toLowerCase() === activeFilter.toLowerCase();
  });

  const total     = logs.length;
  const submitted = logs.filter((l) => l.status === 'submitted').length;
  const approved  = logs.filter((l) => l.status === 'approved').length;
  const totalHrs  = logs.reduce((s, l) => s + (Number(l.hours_worked) || 0), 0);

  return (
    <div className="logs-page">
      {/* Header */}
      <div className="lp-header">
        <div>
          <h1>Weekly Logs</h1>
          <p>View and manage your internship activity logs</p>
        </div>
        <div className="lp-header-actions">
          <Link to="create" className="lp-btn-primary">+ New Log</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="lp-stats">
        {[
          { label: 'Total Logs',  value: total },
          { label: 'Submitted',   value: submitted },
          { label: 'Approved',    value: approved },
          { label: 'Total Hours', value: totalHrs },
        ].map(({ label, value }) => (
          <div className="lp-stat-card" key={label}>
            <div className="lp-stat-label">{label}</div>
            <div className="lp-stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="lp-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            className={`lp-filter-chip${activeFilter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner text="Loading logs…" />
      ) : (
        <div className="lp-table-wrapper">
          <table className="lp-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Date Submitted</th>
                <th>Status</th>
                <th>Hours</th>
                <th>Activities Summary</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="lp-empty">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      <p>No logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.log_id}>
                    <td><strong>Week {log.week_number}</strong></td>
                    <td>{log.submitted_at ? new Date(log.submitted_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`lp-status ${log.status || 'draft'}`}>
                        {log.status || 'Draft'}
                      </span>
                    </td>
                    <td>
                      <span className="lp-hours">⏱ {log.hours_worked ?? 0}h</span>
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.activities_performed || <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                    <td>
                      <Link to={String(log.log_id)} className="lp-link-btn">View →</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Log Detail ────────────────────────────────────────────────────────────
function LogDetails() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [log, setLog] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await logbooksAPI.getLog(id);
        setLog(data);
      } catch (err) {
        console.error('Failed to fetch log', err);
      }
    };
    if (id) fetch();
  }, [id]);

  if (!log) return <LoadingSpinner text="Loading log details…" fullscreen />;

  return (
    <div className="lp-detail-page">
      <button className="lp-back-btn" onClick={() => navigate(-1)}>← Back to Logs</button>
      <div className="lp-detail-card">
        <h2>Week {log.week_number} — Log Details</h2>
        {[
          { label: 'Status',       value: log.status },
          { label: 'Hours Worked', value: `${log.hours_worked ?? 0} hours` },
          { label: 'Submitted At', value: log.submitted_at ? new Date(log.submitted_at).toLocaleString() : 'Not submitted' },
          { label: 'Activities',   value: log.activities_performed || '—' },
          { label: 'Challenges',   value: log.challenges_faced || '—' },
          { label: 'Skills Gained',value: log.skills_gained || '—' },
          { label: 'Next Week Plan', value: log.next_week_plan || '—' },
        ].map(({ label, value }) => (
          <div className="lp-detail-row" key={label}>
            <label>{label}</label>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────
function LogsPage() {
  return (
    <Routes>
      <Route index                                           element={<LogList />} />
      <Route path="create"                                   element={<WeeklyLogForm />} />
      <Route path="create/:placementId"                      element={<WeeklyLogForm />} />
      <Route path="create/:placementId/:weekNumber"          element={<WeeklyLogForm />} />
      <Route path=":id"                                      element={<LogDetails />} />
    </Routes>
  );
}

export default LogsPage;