import React, { useState, useEffect } from 'react';
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

          const sortByRecency = (a, b) => {
            const dateA = new Date(a.start_date || a.created_at || 0).getTime();
            const dateB = new Date(b.start_date || b.created_at || 0).getTime();
            return dateB - dateA;
          };

          const activePlacements = placementsData
            .filter((item) => item.status === 'approved' || item.status === 'completed')
            .sort(sortByRecency);

          const preferredPlacement =
            activePlacements[0] || [...placementsData].sort(sortByRecency)[0];

          if (preferredPlacement) {
            setSelectedPlacementId(preferredPlacement.placement_id);
          }
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
        start_date:
          activePlacement?.start_date || new Date().toISOString().split('T')[0],
        end_date:
          activePlacement?.end_date || new Date().toISOString().split('T')[0],
        activities_performed: formData.activities_performed,
        skills_learned: formData.skills_learned,
        challenges: formData.challenges,
        solutions: formData.solutions,
        hours_worked: formData.hours_worked,
      };

      let savedLog = existingLog;
      if (existingLog) {
        const updatedLog = await logbooksAPI.updateLog(existingLog.log_id, logData);
        savedLog = updatedLog || existingLog;
      } else {
        const createdLog = await logbooksAPI.createLog(logData);
        savedLog = createdLog;
        setExistingLog(createdLog);
      }

      const finalLogId = savedLog?.log_id;

      if (selectedImage && finalLogId) {
        const attachmentFormData = new FormData();
        attachmentFormData.append('log', finalLogId);
        attachmentFormData.append('file', selectedImage);
        if (imageDescription.trim()) {
          attachmentFormData.append('description', imageDescription.trim());
        }
        await logbooksAPI.createAttachment(attachmentFormData);
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

  if (loading) {
    return <LoadingSpinner text="Loading log form…" fullscreen />;
  }

  /* ─── Placement selection screen ─── */
  if (!placementId) {
    const placementCount = placements.length;

    return (
      <div className="weekly-log-page">
        <div className="wl-hero">
          <div>
            <span className="wl-kicker">Weekly logs</span>
            <h1>Create Weekly Log</h1>
            <p>Select your placement, then continue into the log editor.</p>
          </div>
          <div className="wl-hero-pill">
            {placementCount} placement{placementCount === 1 ? '' : 's'} available
          </div>
        </div>

        <div className="wl-shell">
          <section className="wl-card wl-select-card">
            <div className="wl-card-header">
              <h2>Choose a placement</h2>
              <p>Only approved or completed placements are listed here.</p>
            </div>

            <label className="wl-field">
              <span>Placement</span>
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
                    {item.position_title} at{' '}
                    {item.organization?.name || 'Organization'}
                  </option>
                ))}
              </select>
            </label>

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
          </section>

          {/* Tips sidebar */}
          <aside className="wl-card wl-side-card">
            <h3>Before you begin</h3>
            <p>A few things to keep in mind.</p>
            <div className="wl-summary-list" style={{ marginTop: 16 }}>
              {[
                ['📋', 'Log weekly', 'Submit a log for every week of your placement.'],
                ['✏️', 'Be specific', 'Describe tasks in detail for better feedback.'],
                ['📸', 'Add evidence', 'Photos or screenshots strengthen your log.'],
                ['🚀', 'Submit on time', 'Logs are reviewed by your supervisor regularly.'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="wl-summary-item">
                  <span>{icon} {title}</span>
                  <strong style={{ fontWeight: 400, fontSize: 12.5, color: 'var(--muted)' }}>
                    {desc}
                  </strong>
                </div>
              ))}
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

  /* ─── Log editor ─── */
  return (
    <div className="weekly-log-page">
      <div className="wl-hero">
        <div>
          <span className="wl-kicker">Weekly logs</span>
          <h1>Week {weekNumber || 1}</h1>
          <p>
            {placement.position_title} &nbsp;·&nbsp;{' '}
            {placement.organization.name}
          </p>
        </div>
        <div className="wl-hero-pill">
          {existingLog ? 'Draft loaded' : 'New draft'}
        </div>
      </div>

      <div className="wl-shell">
        {/* ── Form card ── */}
        <form className="wl-card wl-form-card" onSubmit={handleSubmit}>
          <div className="wl-card-header">
            <h2>Log details</h2>
            <p>Document the work completed and lessons learned this week.</p>
          </div>

          {/* Section: Activities */}
          <div className="wl-section-tag">Activities</div>
          <div className="wl-grid">
            <label className="wl-field wl-span-2">
              <span>Activities performed</span>
              <textarea
                name="activities_performed"
                value={formData.activities_performed}
                onChange={handleChange}
                rows={5}
                placeholder="Describe the tasks and projects you worked on this week…"
                required
              />
            </label>

            <label className="wl-field">
              <span>Hours worked</span>
              <input
                type="number"
                name="hours_worked"
                value={formData.hours_worked}
                onChange={handleChange}
                min="0"
                step="0.5"
                placeholder="e.g. 40"
                required
              />
            </label>

            <label className="wl-field">
              <span>Skills learned</span>
              <textarea
                name="skills_learned"
                value={formData.skills_learned}
                onChange={handleChange}
                rows={4}
                placeholder="Tools, frameworks, or concepts you picked up…"
                required
              />
            </label>
          </div>

          {/* Section: Challenges */}
          <div className="wl-section-tag" style={{ marginTop: 8 }}>Reflection</div>
          <div className="wl-grid">
            <label className="wl-field">
              <span>Challenges faced</span>
              <textarea
                name="challenges"
                value={formData.challenges}
                onChange={handleChange}
                rows={4}
                placeholder="Any blockers, bugs, or issues encountered…"
              />
            </label>

            <label className="wl-field">
              <span>Solutions implemented</span>
              <textarea
                name="solutions"
                value={formData.solutions}
                onChange={handleChange}
                rows={4}
                placeholder="How you addressed those challenges…"
              />
            </label>
          </div>

          {/* Section: Attachment */}
          <div className="wl-section-tag" style={{ marginTop: 8 }}>Attachment</div>
          <div className="wl-grid">
            <label className="wl-field">
              <span>Image upload (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>

            <label className="wl-field">
              <span>Image caption</span>
              <input
                type="text"
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                placeholder="Short description of the upload…"
              />
            </label>
          </div>

          {imagePreviewUrl && (
            <div className="wl-preview">
              <span>Attachment preview</span>
              <img src={imagePreviewUrl} alt="Upload preview" />
            </div>
          )}

          {error && <div className="wl-message error">{error}</div>}

          <div className="wl-actions">
            <button type="submit" className="wl-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Draft'}
            </button>
            {existingLog && existingLog.status === 'draft' && (
              <button
                type="button"
                onClick={handleSubmitForReview}
                className="wl-btn-secondary"
              >
                Submit for Review →
              </button>
            )}
            <button
              type="button"
              className="wl-btn-secondary"
              onClick={() => navigate(-1)}
              style={{ marginLeft: 'auto' }}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* ── Sidebar ── */}
        <aside className="wl-card wl-side-card">
          <h3>Placement summary</h3>
          <p>Your current placement details.</p>

          <div className="wl-summary-list">
            <div className="wl-summary-item">
              <span>Organization</span>
              <strong>{placement.organization.name}</strong>
            </div>
            <div className="wl-summary-item">
              <span>Position</span>
              <strong>{placement.position_title}</strong>
            </div>
            <div className="wl-summary-item">
              <span>Status</span>
              <strong>
                <span className={`wl-status-badge ${placement.status}`}>
                  {placement.status}
                </span>
              </strong>
            </div>
            <div className="wl-summary-item">
              <span>Start date</span>
              <strong>{placement.start_date || 'N/A'}</strong>
            </div>
            <div className="wl-summary-item">
              <span>End date</span>
              <strong>{placement.end_date || 'N/A'}</strong>
            </div>
            <div className="wl-summary-item">
              <span>Current week</span>
              <strong>Week {weekNumber || 1}</strong>
            </div>
          </div>

          <div className="wl-side-note">
            Save your log as a draft first. Once the week is complete, submit it
            for supervisor review.
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WeeklyLogForm;