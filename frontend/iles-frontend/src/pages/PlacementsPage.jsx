import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiBriefcase, FiCalendar, FiCheckSquare, FiClock, FiHash, FiMessageCircle, FiXCircle, FiCheck, FiTrash2, FiFileText } from 'react-icons/fi';
import { useAuth } from '../hooks/AuthContext';
import { placementsAPI, organizationsAPI } from '../services/endpoints';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './PlacementsPage.css';

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Completed'];

const STATUS_META = {
  approved:  { color: '#10b981', bg: 'rgba(16,185,129,0.10)',  label: 'Approved',  icon: <FiCheck aria-hidden="true" /> },
  pending:   { color: '#ff7a00', bg: 'rgba(255,122,0,0.10)',  label: 'Pending',   icon: <FiClock aria-hidden="true" /> },
  rejected:  { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   label: 'Rejected',  icon: <FiXCircle aria-hidden="true" /> },
  completed: { color: '#6366f1', bg: 'rgba(99,102,241,0.10)', label: 'Completed', icon: <FiCheckSquare aria-hidden="true" /> },
  active:    { color: '#10b981', bg: 'rgba(16,185,129,0.10)',  label: 'Active',    icon: <FiCheckSquare aria-hidden="true" /> },
};

function formatDate(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysCount(start, end) {
  if (!start || !end) return null;
  const diff = new Date(end) - new Date(start);
  return Math.max(0, Math.round(diff / 86400000));
}

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
        <div className="pl-header-actions">
          <Link to="create" className="lp-btn-primary">
            + New Placement
          </Link>
          <Link to="/app/dashboard" className="lp-btn-back">
            ← Back to Dashboard
          </Link>
        </div>
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
          <FiBriefcase size={48} />
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
                    {isAct === 'approve' ? '…' : <><FiCheck aria-hidden="true" /> Approve</>}
                  </button>
                  <button
                    className="pl-action-btn reject"
                    disabled={!!isAct || done}
                    onClick={() => handleAction(pl.placement_id, 'reject')}
                  >
                    {isAct === 'reject' ? '…' : <><FiXCircle aria-hidden="true" /> Reject</>}
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
  const location = useLocation();
  const navigate = useNavigate();
  const editPlacement = location.state?.placement || null;
  const isEditMode = Boolean(editPlacement);
  const hasExistingLetter = Boolean(editPlacement?.documents?.some((document) => document.document_type === 'acceptance_letter'));
  const [orgs, setOrgs]       = useState([]);
  const [organizationMode, setOrganizationMode] = useState('existing');
  const [form, setForm]       = useState({
    position_title: editPlacement?.position_title || '',
    organization: editPlacement?.organization || '',
    start_date: editPlacement?.start_date || '',
    end_date: editPlacement?.end_date || '',
    workplace_supervisor_email: editPlacement?.workplace_supervisor_email || '',
  });
  const [acceptanceLetter, setAcceptanceLetter] = useState(null);
  const [newOrganization, setNewOrganization] = useState({
    name: '',
    industry: '',
    address: '',
    city: '',
    country: '',
    contact_email: '',
    contact_phone: '',
  });
  const [submitting, setSub]  = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!isEditMode) {
      organizationsAPI.getOrganizations().then((d) => setOrgs(d.results || d || [])).catch(() => {});
    }
  }, [isEditMode]);

  useEffect(() => {
    if (editPlacement) {
      setForm({
        position_title: editPlacement.position_title || '',
        organization: editPlacement.organization || '',
        start_date: editPlacement.start_date || '',
        end_date: editPlacement.end_date || '',
        workplace_supervisor_email: editPlacement.workplace_supervisor_email || '',
      });
      setOrganizationMode('existing');
    }
  }, [editPlacement]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleNewOrganizationChange = (e) => {
    setNewOrganization((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLetterChange = (e) => {
    setAcceptanceLetter(e.target.files?.[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSub(true);
    setError('');
    try {
      let organizationId = form.organization;
      if (!isEditMode && organizationMode === 'new') {
        const createdOrganization = await organizationsAPI.createOrganization(newOrganization);
        organizationId = createdOrganization.organization_id;
      }

      const payload = new FormData();
      payload.append('position_title', form.position_title);
      payload.append('start_date', form.start_date);
      payload.append('end_date', form.end_date);
      payload.append('workplace_supervisor_email', form.workplace_supervisor_email.trim());
      if (organizationId) {
        payload.append('organization', organizationId);
      }
      if (acceptanceLetter) {
        payload.append('acceptance_letter', acceptanceLetter);
      } else if (!isEditMode || !hasExistingLetter) {
        throw new Error('Please upload your acceptance letter before submitting.');
      }

      const savedPlacement = isEditMode
        ? await placementsAPI.updatePlacement(editPlacement.placement_id, payload)
        : await placementsAPI.createPlacement(payload);

      navigate(`/app/placements/${savedPlacement.placement_id}`);
    } catch (err) {
      const apiError = err?.response?.data;
      const firstFieldError = apiError && typeof apiError === 'object'
        ? Object.values(apiError).find((val) => Array.isArray(val) && val.length > 0)?.[0]
        : '';
      setError(firstFieldError || apiError?.detail || err.message || 'Failed to save placement. Please try again.');
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="pl-create-page">
      <button className="pl-back-btn" onClick={() => navigate(-1)}>← Back</button>
      <div className="pl-create-card">
        <h2>{isEditMode ? 'Update Placement' : 'New Placement'}</h2>
        <form className="pl-form" onSubmit={handleSubmit}>
          <div className="pl-field">
            <label htmlFor="position_title">Position Title *</label>
            <input id="position_title" name="position_title" value={form.position_title} onChange={handleChange} placeholder="e.g. Software Engineering Intern" required />
          </div>

          {isEditMode ? (
            <div className="pl-field">
              <label>Organization</label>
              <div className="pl-readonly-value">
                {editPlacement.organization_details?.name || `Organization #${editPlacement.organization}`}
              </div>
            </div>
          ) : (
            <>
              <div className="pl-org-mode-switch" role="group" aria-label="Organization input mode">
                <button
                  type="button"
                  className={`pl-org-mode-btn${organizationMode === 'existing' ? ' active' : ''}`}
                  onClick={() => setOrganizationMode('existing')}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  className={`pl-org-mode-btn${organizationMode === 'new' ? ' active' : ''}`}
                  onClick={() => setOrganizationMode('new')}
                >
                  Add New Organization
                </button>
              </div>

              {organizationMode === 'existing' ? (
                <div className="pl-field">
                  <label htmlFor="organization">Organization *</label>
                  <select id="organization" name="organization" value={form.organization} onChange={handleChange} required>
                    <option value="">Select organisation…</option>
                    {orgs.map((o) => <option key={o.organization_id} value={o.organization_id}>{o.name}</option>)}
                  </select>
                </div>
              ) : (
                <>
                  <div className="pl-field">
                    <label htmlFor="name">Organization Name *</label>
                    <input id="name" name="name" value={newOrganization.name} onChange={handleNewOrganizationChange} placeholder="e.g. Acme Technologies" required />
                  </div>
                  <div className="pl-form-row">
                    <div className="pl-field">
                      <label htmlFor="industry">Industry *</label>
                      <input id="industry" name="industry" value={newOrganization.industry} onChange={handleNewOrganizationChange} placeholder="e.g. Information Technology" required />
                    </div>
                    <div className="pl-field">
                      <label htmlFor="contact_phone">Contact Phone *</label>
                      <input id="contact_phone" name="contact_phone" value={newOrganization.contact_phone} onChange={handleNewOrganizationChange} placeholder="e.g. +255700000000" required />
                    </div>
                  </div>
                  <div className="pl-field">
                    <label htmlFor="address">Address *</label>
                    <textarea id="address" name="address" value={newOrganization.address} onChange={handleNewOrganizationChange} placeholder="Office address" rows={3} required />
                  </div>
                  <div className="pl-form-row">
                    <div className="pl-field">
                      <label htmlFor="city">City *</label>
                      <input id="city" name="city" value={newOrganization.city} onChange={handleNewOrganizationChange} placeholder="e.g. Dar es Salaam" required />
                    </div>
                    <div className="pl-field">
                      <label htmlFor="country">Country *</label>
                      <input id="country" name="country" value={newOrganization.country} onChange={handleNewOrganizationChange} placeholder="e.g. Tanzania" required />
                    </div>
                  </div>
                  <div className="pl-field">
                    <label htmlFor="contact_email">Contact Email *</label>
                    <input id="contact_email" name="contact_email" type="email" value={newOrganization.contact_email} onChange={handleNewOrganizationChange} placeholder="e.g. hr@acme.com" required />
                  </div>
                </>
              )}
            </>
          )}

          <div className="pl-field">
            <label htmlFor="workplace_supervisor_email">Workplace Supervisor Email *</label>
            <input id="workplace_supervisor_email" name="workplace_supervisor_email" type="email" value={form.workplace_supervisor_email} onChange={handleChange} placeholder="e.g. supervisor@company.com" required />
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
            <label htmlFor="acceptance_letter">Placement Letter {isEditMode ? '' : '*'}</label>
            <input id="acceptance_letter" name="acceptance_letter" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleLetterChange} required={!isEditMode || !hasExistingLetter} />
            <p className="pl-help-text">Upload the letter from the company or workplace that confirms your placement.</p>
          </div>
          {error && <p className="pl-error-message">{error}</p>}
          <button type="submit" className="pl-submit-btn" disabled={submitting}>
            {submitting ? 'Saving…' : isEditMode ? 'Update Placement' : 'Submit Placement'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Placement Details ─────────────────────────────────────────────────────
function PlacementDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pl, setPl]           = useState(null);
  const [loading, setLoading]  = useState(true);
  const [revealed, setReveal] = useState(false);
  const [error, setError]      = useState('');
  const [deletingDocId, setDeletingDocId] = useState(null);

  const loadPlacement = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await placementsAPI.getPlacement(id);
      setPl(data);
      setTimeout(() => setReveal(true), 50);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load placement details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPlacement();
  }, [loadPlacement]);

  if (loading) return <LoadingSpinner text="Loading placement…" fullscreen />;
  if (error || !pl) {
    return (
      <div className="pl-empty">
        <FiBriefcase size={48} />
        <p>{error || 'Placement not found.'}</p>
        <button className="lp-btn-primary" onClick={() => navigate('/app/placements')}>Back to placements</button>
      </div>
    );
  }

  const sm   = STATUS_META[pl.status?.toLowerCase()] || STATUS_META.pending;
  const days = daysCount(pl.start_date, pl.end_date);
  const org  = pl.organization_details?.name || `Organisation #${pl.organization}`;
  const isOwner = String(pl.student_details?.user_details?.user_id || '') === String(user?.user_id || '');
  const isEditable = Boolean(pl.is_editable);
  const acceptanceLetter = (pl.documents || []).find((document) => document.document_type === 'acceptance_letter');

  const handleEditPlacement = () => {
    navigate('/app/placements/create', { state: { placement: pl } });
  };

  const handleDeleteLetter = async () => {
    if (!acceptanceLetter) return;
    setDeletingDocId(acceptanceLetter.document_id);
    try {
      await placementsAPI.deletePlacementDocument(acceptanceLetter.document_id);
      await loadPlacement();
    } catch (deleteError) {
      console.error('Failed to delete placement letter', deleteError);
    } finally {
      setDeletingDocId(null);
    }
  };

  return (
    <div className={`pd-shell${revealed ? ' pd-shell--in' : ''}`}>

      {/* Back */}
      <button className="pd-back" onClick={() => navigate(-1)}>
        <FiArrowLeft size={16} />
        Back to Placements
      </button>

      <div className="pd-layout">

        {/* ── Left column ── */}
        <div className="pd-left">

          {/* Hero */}
          <div className="pd-hero">
            <div className="pd-hero-accent" style={{ '--sm-color': sm.color }} />
            <div className="pd-org-tag">{org}</div>
            <h1 className="pd-title">{pl.position_title}</h1>
            <div className="pd-status-badge" style={{ color: sm.color, background: sm.bg }}>
              <span className="pd-status-icon">{sm.icon}</span>
              {sm.label}
            </div>
          </div>

          {/* Duration */}
          {days !== null && (
            <div className="pd-duration-card">
              <div className="pd-duration-number">{days}</div>
              <div className="pd-duration-label">day placement</div>
            </div>
          )}

          {/* Description */}
          {pl.description && (
            <div className="pd-desc-block">
              <div className="pd-block-heading">About this Role</div>
              <p className="pd-desc-text">{pl.description}</p>
            </div>
          )}

          {isOwner && isEditable && (
            <div className="pd-desc-block">
              <div className="pd-block-heading">Edit Submission</div>
              <p className="pd-desc-text">You can update this placement while the acceptance letter is not attached.</p>
              <button className="pd-action-btn pd-action-btn--back" onClick={handleEditPlacement}>
                <FiCheckSquare aria-hidden="true" /> Edit placement
              </button>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="pd-right">
          <div className="pd-info-card">
            <div className="pd-block-heading">Placement Details</div>

            <div className="pd-info-rows">
              {[
                {
                  icon: <FiCalendar size={18} />,
                  label: 'Start Date',
                  value: formatDate(pl.start_date),
                },
                {
                  icon: <FiCheckSquare size={18} />,
                  label: 'End Date',
                  value: formatDate(pl.end_date),
                },
                {
                  icon: <FiMessageCircle size={18} />,
                  label: 'Organisation',
                  value: org,
                },
                {
                  icon: <FiClock size={18} />,
                  label: 'Submission',
                  value: pl.is_submitted ? 'Submitted' : 'Draft',
                },
                {
                  icon: <FiMessageCircle size={18} />,
                  label: 'Supervisor Email',
                  value: pl.workplace_supervisor_email || '—',
                },
                {
                  icon: <FiClock size={18} />,
                  label: 'Status',
                  value: <span style={{ color: sm.color, fontWeight: 700 }}>{sm.label}</span>,
                },
                ...(pl.placement_id ? [{
                  icon: <FiHash size={18} />,
                  label: 'Placement ID',
                  value: `#${pl.placement_id}`,
                }] : []),
              ].map(({ icon, label, value }, i) => (
                <div className="pd-info-row" key={label} style={{ '--delay': `${i * 60}ms` }}>
                  <div className="pd-info-icon">{icon}</div>
                  <div className="pd-info-content">
                    <div className="pd-info-label">{label}</div>
                    <div className="pd-info-value">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pd-info-card">
            <div className="pd-block-heading">Placement Letter</div>
            {acceptanceLetter ? (
              <div className="pd-info-rows">
                <div className="pd-info-row">
                  <div className="pd-info-icon"><FiFileText size={18} /></div>
                  <div className="pd-info-content">
                    <div className="pd-info-label">Uploaded letter</div>
                    <div className="pd-info-value">
                      <a href={acceptanceLetter.file_url} target="_blank" rel="noreferrer">Open uploaded letter</a>
                    </div>
                  </div>
                </div>
                {isOwner && (
                  <div className="pd-actions">
                    <button
                      className="pd-action-btn pd-action-btn--back"
                      onClick={handleDeleteLetter}
                      disabled={deletingDocId === acceptanceLetter.document_id}
                    >
                      {deletingDocId === acceptanceLetter.document_id ? 'Deleting…' : <><FiTrash2 aria-hidden="true" /> Delete letter</>}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="pd-desc-text">No acceptance letter is attached yet.</p>
            )}
          </div>

          <div className="pd-actions">
            <button className="pd-action-btn pd-action-btn--back" onClick={() => navigate(-1)}>
              ← Go Back
            </button>
          </div>
        </div>

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