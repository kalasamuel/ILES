import React, { useEffect, useState } from 'react';
import { Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
import { placementsAPI, organizationsAPI } from '../services/endpoints';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './PlacementsPage.css';

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Completed'];

// ── Placement List ────────────────────────────────────────────────────────
function PlacementList() {
  const [placements, setPlacements]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeFilter, setFilter]     = useState('All');
  const [actionLoading, setActing]    = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await placementsAPI.getPlacements();
        setPlacements(data.results || data || []);
      } catch (err) {
        console.error('Failed to fetch placements', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleAction = async (id, action) => {
    setActing((p) => ({ ...p, [id]: action }));
    try {
      if (action === 'approve') await placementsAPI.approvePlacement(id);
      else                      await placementsAPI.rejectPlacement(id);
      setPlacements((prev) =>
        prev.map((p) => p.placement_id === id ? { ...p, status: action === 'approve' ? 'approved' : 'rejected' } : p)
      );
    } catch (err) {
      console.error(`Failed to ${action} placement`, err);
    } finally {
      setActing((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  const filtered = placements.filter((p) => {
    if (activeFilter === 'All') return true;
    return p.status?.toLowerCase() === activeFilter.toLowerCase();
  });

  const total     = placements.length;
  const approved  = placements.filter((p) => p.status === 'approved').length;
  const pending   = placements.filter((p) => p.status === 'pending').length;
  const completed = placements.filter((p) => p.status === 'completed').length;

  return (
    <div className="placements-full-page">
      <div className="pl-header">
        <div>
          <h1>Placements</h1>
          <p>Manage internship placements and their approval status</p>
        </div>
        <Link to="create" className="lp-btn-primary">
          + New Placement
        </Link>
      </div>

      {/* Stats */}
      <div className="pl-stats">
        {[
          { label: 'Total Placements', value: total },
          { label: 'Approved',         value: approved },
          { label: 'Pending',          value: pending },
          { label: 'Completed',        value: completed },
        ].map(({ label, value }) => (
          <div className="pl-stat-card" key={label}>
            <div className="pl-stat-label">{label}</div>
            <div className="pl-stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="pl-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            className={`pl-filter-chip${activeFilter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <LoadingSpinner text="Loading placements…" />
      ) : filtered.length === 0 ? (
        <div className="pl-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          <p>No placements found</p>
        </div>
      ) : (
        <div className="pl-cards-grid">
          {filtered.map((pl) => {
            const done    = pl.status === 'approved' || pl.status === 'rejected';
            const isAct   = actionLoading[pl.placement_id];
            return (
              <div className="pl-card" key={pl.placement_id}>
                <div className="pl-card-top">
                  <div>
                    <div className="pl-card-title">{pl.position_title}</div>
                    <div className="pl-card-org">{pl.organization_details?.name || `Organization #${pl.organization}`}</div>
                  </div>
                  <span className={`pl-status ${pl.status || 'pending'}`}>{pl.status || 'Pending'}</span>
                </div>

                <div className="pl-card-dates">
                  <span><strong>Start:</strong> {pl.start_date ? new Date(pl.start_date).toLocaleDateString() : '—'}</span>
                  <span><strong>End:</strong>   {pl.end_date   ? new Date(pl.end_date).toLocaleDateString()   : '—'}</span>
                </div>

                <div className="pl-card-footer">
                  <Link to={String(pl.placement_id)} className="pl-action-btn secondary">View Details</Link>
                  <button
                    className="pl-action-btn approve"
                    disabled={!!isAct || done}
                    onClick={() => handleAction(pl.placement_id, 'approve')}
                  >
                    {isAct === 'approve' ? '…' : '✓ Approve'}
                  </button>
                  <button
                    className="pl-action-btn reject"
                    disabled={!!isAct || done}
                    onClick={() => handleAction(pl.placement_id, 'reject')}
                  >
                    {isAct === 'reject' ? '…' : '✗ Reject'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Create Placement ──────────────────────────────────────────────────────
function PlacementCreate() {
  const navigate = useNavigate();
  const [orgs, setOrgs]       = useState([]);
  const [form, setForm]       = useState({ position_title: '', organization: '', start_date: '', end_date: '', description: '' });
  const [submitting, setSub]  = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    organizationsAPI.getOrganizations().then((d) => setOrgs(d.results || d || [])).catch(() => {});
  }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSub(true);
    setError('');
    try {
      await placementsAPI.createPlacement(form);
      navigate('/app/placements');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create placement. Please try again.');
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="pl-create-page">
      <button className="pl-back-btn" onClick={() => navigate(-1)}>← Back</button>
      <div className="pl-create-card">
        <h2>New Placement</h2>
        <form className="pl-form" onSubmit={handleSubmit}>
          <div className="pl-field">
            <label htmlFor="position_title">Position Title *</label>
            <input id="position_title" name="position_title" value={form.position_title} onChange={handleChange} placeholder="e.g. Software Engineering Intern" required />
          </div>
          <div className="pl-field">
            <label htmlFor="organization">Organization *</label>
            <select id="organization" name="organization" value={form.organization} onChange={handleChange} required>
              <option value="">Select organisation…</option>
              {orgs.map((o) => <option key={o.organization_id} value={o.organization_id}>{o.name}</option>)}
            </select>
          </div>
          <div className="pl-form-row">
            <div className="pl-field">
              <label htmlFor="start_date">Start Date *</label>
              <input id="start_date" name="start_date" type="date" value={form.start_date} onChange={handleChange} required />
            </div>
            <div className="pl-field">
              <label htmlFor="end_date">End Date *</label>
              <input id="end_date" name="end_date" type="date" value={form.end_date} onChange={handleChange} required />
            </div>
          </div>
          <div className="pl-field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" value={form.description} onChange={handleChange} placeholder="Brief description of the role…" rows={4} />
          </div>
          {error && <p className="pl-error-message">{error}</p>}
          <button type="submit" className="pl-submit-btn" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Placement'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Placement Details ─────────────────────────────────────────────────────
function PlacementDetails() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const [pl, setPl] = useState(null);

  useEffect(() => {
    if (id) placementsAPI.getPlacement(id).then(setPl).catch(console.error);
  }, [id]);

  if (!pl) return <LoadingSpinner text="Loading placement…" fullscreen />;

  return (
    <div className="pl-detail-page">
      <button className="pl-back-btn" onClick={() => navigate(-1)}>← Back to Placements</button>
      <div className="pl-detail-card">
        <h2>{pl.position_title}</h2>
        {[
          { label: 'Organisation', value: pl.organization_details?.name || `#${pl.organization}` },
          { label: 'Status',       value: pl.status },
          { label: 'Start Date',   value: pl.start_date ? new Date(pl.start_date).toLocaleDateString() : '—' },
          { label: 'End Date',     value: pl.end_date   ? new Date(pl.end_date).toLocaleDateString()   : '—' },
          { label: 'Description',  value: pl.description || '—' },
        ].map(({ label, value }) => (
          <div className="pl-detail-row" key={label}>
            <label>{label}</label>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────
function PlacementsPage() {
  return (
    <Routes>
      <Route index             element={<PlacementList />} />
      <Route path="create"     element={<PlacementCreate />} />
      <Route path=":id"        element={<PlacementDetails />} />
    </Routes>
  );
}

export default PlacementsPage;