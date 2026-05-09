import React, { useEffect, useMemo, useState } from 'react';
import { FiClipboard, FiEdit3, FiCamera, FiZap, FiSave, FiInfo } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import { logbooksAPI, placementsAPI } from '../services/endpoints';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './WeeklyLogForm.css';

const WeeklyLogForm = () => {
  const { placementId, weekNumber } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    activities_performed: '',
    skills_learned: '',
    challenges: '',
    solutions: '',
    hours_worked: 0,
  });

  const [placement, setPlacement] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState('');
  const [existingLog, setExistingLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDescription, setImageDescription] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const selectedPlacement = placements.find(
    (item) => String(item.placement_id) === String(selectedPlacementId)
  );
  const activePlacement = placement || selectedPlacement;

  useEffect(() => {
    const fetchData = async () => {
      if (!placementId) {
        try {
          const placementsRes = await placementsAPI.getPlacements();
          const placementsData = placementsRes?.results || placementsRes || [];
          setPlacements(placementsData);

          const sortByRecency = (a, b) =>
            new Date(b.start_date || b.created_at || 0) -
            new Date(a.start_date || a.created_at || 0);

          const activePlacements = placementsData
            .filter((p) => p.status === 'approved' || p.status === 'completed')
            .sort(sortByRecency);

          const preferred = activePlacements[0] || [...placementsData].sort(sortByRecency)[0];
          if (preferred) setSelectedPlacementId(preferred.placement_id);
        } catch {
          setError('Failed to load placements');
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const placementRes = await placementsAPI.getPlacement(placementId);
        setPlacement(placementRes);

        if (weekNumber) {
          const logsRes = await logbooksAPI.getLogs();
          const logsData = logsRes?.results || logsRes || [];
          const existing = logsData.find(
            (log) =>
              (log.placement === placementId ||
                log.placement?.placement_id === placementId) &&
              log.week_number === parseInt(weekNumber)
          );
          if (existing) {
            setExistingLog(existing);
            setFormData({
              activities_performed: existing.activities_performed,
              skills_learned: existing.skills_learned,
              challenges: existing.challenges,
              solutions: existing.solutions,
              hours_worked: existing.hours_worked,
            });
          }
        }
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [placementId, weekNumber]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handlePlacementContinue = () => {
    if (!selectedPlacementId) {
      setError('Please select a placement to continue');
      return;
    }
    navigate(`/app/logs/create/${selectedPlacementId}`);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'hours_worked' ? parseFloat(value) || 0 : value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedImage(file);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
    if (file) setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activePlacement) return;
    setSaving(true);
    setError('');

    try {
      const logData = {
        placement: activePlacement.placement_id,
        week_number: weekNumber ? parseInt(weekNumber) : 1,
        start_date: activePlacement?.start_date || new Date().toISOString().split('T')[0],
        end_date: activePlacement?.end_date || new Date().toISOString().split('T')[0],
        ...formData,
      };

      let savedLog = existingLog;
      if (existingLog) {
        savedLog = (await logbooksAPI.updateLog(existingLog.log_id, logData)) || existingLog;
      } else {
        savedLog = await logbooksAPI.createLog(logData);
        setExistingLog(savedLog);
      }

      if (selectedImage && savedLog?.log_id) {
        const fd = new FormData();
        fd.append('log', savedLog.log_id);
        fd.append('file', selectedImage);
        if (imageDescription.trim()) fd.append('description', imageDescription.trim());
        await logbooksAPI.createAttachment(fd);
      }

      navigate('/app/dashboard');
    } catch {
      setError('Failed to save log. Please check your entries and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!existingLog) return;
    try {
      await logbooksAPI.submitLog(existingLog.log_id);
      navigate('/app/dashboard');
    } catch {
      setError('Failed to submit log for review.');
    }
  };

  if (loading) return <LoadingSpinner text="Loading log form…" fullscreen />;

  /* ─────────────────────────────────────────────────
     PLACEMENT SELECTION SCREEN
  ───────────────────────────────────────────────── */
  if (!placementId) {
    return (
      <div className="weekly-log-page">
        <div className="wl-hero">
          <div className="wl-hero-left">
            <span className="wl-kicker">Weekly logs</span>
            <h1>Create Weekly Log</h1>
            <p>Select your placement, then continue into the log editor.</p>
          </div>
          <div className="wl-hero-pill">
            {placements.length} placement{placements.length === 1 ? '' : 's'} available
          </div>
        </div>

        <div className="wl-shell">
          {/* Form card */}
          <section className="wl-card wl-select-card">
            <div className="wl-card-header">
              <h2>Choose a placement</h2>
              <p>Only approved or completed placements are listed here.</p>
            </div>

            <div className="wl-card-body">
              <div className="wl-field">
                <div className="wl-field-label">
                  <span>Placement</span>
                </div>
                <div className="wl-input-wrap">
                  <select
                    value={selectedPlacementId}
                    onChange={(e) => {
                      setSelectedPlacementId(e.target.value);
                      setError('');
                    }}
                  >
                    <option value="">— Select a placement —</option>
                    {placements.map((item) => (
                      <option key={item.placement_id} value={item.placement_id}>
                        {item.position_title} at {item.organization?.name || 'Organization'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <div className="wl-message error">{error}</div>}

              <div className="wl-actions">
                <button
                  type="button"
                  className="wl-btn-primary"
                  onClick={handlePlacementContinue}
                  disabled={!selectedPlacementId}
                >
                  Continue →
                </button>
              </div>
            </div>
          </section>

          {/* Tips sidebar */}
          <aside className="wl-card wl-side-card">
            <div className="wl-side-header">
              <h3>Before you begin</h3>
              <p>Tips for a great weekly log.</p>
            </div>
            <div className="wl-side-body">
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { icon: <FiClipboard aria-hidden="true" />, title: 'Log every week', desc: 'Submit a log for each week of your placement without gaps.' },
                  { icon: <FiEdit3 aria-hidden="true" />, title: 'Be specific', desc: 'Describe tasks in detail — vague entries get less useful feedback.' },
                  { icon: <FiCamera aria-hidden="true" />, title: 'Add evidence', desc: 'Photos or screenshots make your log more compelling.' },
                  { icon: <FiZap aria-hidden="true" />, title: 'Submit on time', desc: 'Logs are reviewed regularly by your supervisor.' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="wl-tip-card">
                    <div className="wl-tip-icon">{icon}</div>
                    <div>
                      <div className="wl-tip-title">{title}</div>
                      <div className="wl-tip-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (!placement) {
    return (
      <div className="weekly-log-page">
        <div className="wl-message error">Placement not found.</div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────
     LOG EDITOR
  ───────────────────────────────────────────────── */
  return (
    <div className="weekly-log-page">
      <div className="wl-hero">
        <div className="wl-hero-left">
          <span className="wl-kicker">Weekly logs</span>
          <h1>Week {weekNumber || 1}</h1>
          <p>
            {placement.position_title}&nbsp;&nbsp;·&nbsp;&nbsp;{placement.organization.name}
          </p>
        </div>
        <div className="wl-hero-pill">
          {existingLog ? 'Draft loaded' : 'New draft'}
        </div>
      </div>

      <div className="wl-shell">

        {/* ── Main form ── */}
        <form className="wl-card wl-form-card" onSubmit={handleSubmit}>
          <div className="wl-card-header">
            <h2>Log details</h2>
            <p>Document what you did and learned this week.</p>
          </div>

          <div className="wl-card-body">

            {/* Activities section */}
            <div className="wl-section">
              <div className="wl-section-tag"><span>Activities</span></div>
              <div className="wl-grid">
                <div className="wl-field wl-span-2">
                  <div className="wl-field-label">
                    <span>Activities performed</span>
                    <em>Required</em>
                  </div>
                  <div className="wl-input-wrap">
                    <textarea
                      name="activities_performed"
                      value={formData.activities_performed}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Describe the tasks and projects you worked on this week…"
                      required
                    />
                  </div>
                </div>

                <div className="wl-field">
                  <div className="wl-field-label">
                    <span>Hours worked</span>
                    <em>Required</em>
                  </div>
                  <div className="wl-input-wrap">
                    <input
                      type="number"
                      name="hours_worked"
                      value={formData.hours_worked}
                      onChange={handleChange}
                      min="0"
                      step="0.5"
                      placeholder="40"
                      required
                    />
                  </div>
                </div>

                <div className="wl-field">
                  <div className="wl-field-label">
                    <span>Skills learned</span>
                    <em>Required</em>
                  </div>
                  <div className="wl-input-wrap">
                    <textarea
                      name="skills_learned"
                      value={formData.skills_learned}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Tools, frameworks, or concepts you picked up…"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Reflection section */}
            <div className="wl-section">
              <div className="wl-section-tag"><span>Reflection</span></div>
              <div className="wl-grid">
                <div className="wl-field">
                  <div className="wl-field-label">
                    <span>Challenges faced</span>
                    <em>Optional</em>
                  </div>
                  <div className="wl-input-wrap">
                    <textarea
                      name="challenges"
                      value={formData.challenges}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Any blockers, bugs, or issues encountered…"
                    />
                  </div>
                </div>

                <div className="wl-field">
                  <div className="wl-field-label">
                    <span>Solutions implemented</span>
                    <em>Optional</em>
                  </div>
                  <div className="wl-input-wrap">
                    <textarea
                      name="solutions"
                      value={formData.solutions}
                      onChange={handleChange}
                      rows={4}
                      placeholder="How you addressed those challenges…"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Attachment section */}
            <div className="wl-section">
              <div className="wl-section-tag"><span>Attachment</span></div>
              <div className="wl-grid">
                <div className="wl-field">
                  <div className="wl-field-label">
                    <span>Upload image</span>
                    <em>Optional</em>
                  </div>
                  <div className="wl-input-wrap">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>

                <div className="wl-field">
                  <div className="wl-field-label">
                    <span>Image caption</span>
                  </div>
                  <div className="wl-input-wrap">
                    <input
                      type="text"
                      value={imageDescription}
                      onChange={(e) => setImageDescription(e.target.value)}
                      placeholder="Short description of the upload…"
                    />
                  </div>
                </div>
              </div>

              {imagePreviewUrl && (
                <div className="wl-preview">
                  <div className="wl-preview-label">Attachment preview</div>
                  <img src={imagePreviewUrl} alt="Upload preview" />
                </div>
              )}
            </div>

            {error && <div className="wl-message error">{error}</div>}

            <div className="wl-actions">
              <button type="submit" className="wl-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : <><FiSave aria-hidden="true" /> Save Draft</>}
              </button>
              {existingLog?.status === 'draft' && (
                <button type="button" onClick={handleSubmitForReview} className="wl-btn-secondary">
                  Submit for Review →
                </button>
              )}
              <div className="wl-actions-spacer" />
              <button type="button" className="wl-btn-ghost" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
          </div>
        </form>

        {/* ── Sidebar ── */}
        <aside className="wl-card wl-side-card">
          <div className="wl-side-header">
            <h3>Placement summary</h3>
            <p>Your current placement details.</p>
          </div>
          <div className="wl-side-body">
            <div className="wl-summary-list">
              {[
                { label: 'Organization', value: placement.organization.name },
                { label: 'Position', value: placement.position_title },
                {
                  label: 'Status',
                  value: (
                    <span className={`wl-status-badge ${placement.status}`}>
                      {placement.status}
                    </span>
                  ),
                },
                { label: 'Start date', value: placement.start_date || 'N/A' },
                { label: 'End date', value: placement.end_date || 'N/A' },
                { label: 'Current week', value: `Week ${weekNumber || 1}` },
              ].map(({ label, value }) => (
                <div key={label} className="wl-summary-item">
                  <div className="wl-summary-item-label">{label}</div>
                  <div className="wl-summary-item-value">{value}</div>
                </div>
              ))}
            </div>

            <div className="wl-side-note">
              <span className="wl-side-note-icon"><FiInfo aria-hidden="true" /></span>
              <span>
                Save as a draft first. Once the week is complete, submit for
                supervisor review.
              </span>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default WeeklyLogForm;