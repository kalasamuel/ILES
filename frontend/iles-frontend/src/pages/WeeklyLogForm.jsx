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

  const selectedPlacement = placements.find((item) => String(item.placement_id) === String(selectedPlacementId));

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
            (log) => (log.placement === placementId || log.placement?.placement_id === placementId) && log.week_number === parseInt(weekNumber)
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
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
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

    if (file) {
      setImagePreviewUrl(URL.createObjectURL(file));
    }
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
      setError('Failed to save log');
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
      setError('Failed to submit log');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading log form…" fullscreen />;
  }

  if (!placementId) {
    const placementCount = placements.length;

    return (
      <div className="weekly-log-page">
        <div className="wl-hero">
          <div>
            <span className="wl-kicker">Weekly logs</span>
            <h1>Create Weekly Log</h1>
            <p>Select the placement you want to document, then continue into the log editor.</p>
          </div>
          <div className="wl-hero-pill">
            {placementCount} available placement{placementCount === 1 ? '' : 's'}
          </div>
        </div>

        <div className="wl-shell">
          <section className="wl-card wl-select-card">
            <div className="wl-card-header">
              <div>
                <h2>Choose a placement</h2>
                <p>Only approved or completed placements are shown here.</p>
              </div>
            </div>

            <label className="wl-field">
              <span>Placement</span>
              <select
                id="placement"
                value={selectedPlacementId}
                onChange={(e) => setSelectedPlacementId(e.target.value)}
              >
                <option value="">Select placement</option>
                {placements.map((item) => (
                  <option key={item.placement_id} value={item.placement_id}>
                    {item.position_title} at {item.organization?.name || 'Organization'}
                  </option>
                ))}
              </select>
            </label>

            {error && <div className="wl-message error">{error}</div>}

            <div className="wl-actions">
              <button type="button" className="wl-btn-primary" onClick={handlePlacementContinue} disabled={!selectedPlacementId}>
                Continue
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!placement) {
    return <div className="wl-message error">Placement not found</div>;
  }

  return (
    <div className="weekly-log-page">
      <div className="wl-hero">
        <div>
          <span className="wl-kicker">Weekly logs</span>
          <h1>Week {weekNumber || 1}</h1>
          <p>{placement.position_title} at {placement.organization.name}</p>
        </div>
        <div className="wl-hero-pill">
          {existingLog ? 'Draft loaded' : 'New draft'}
        </div>
      </div>

      <div className="wl-shell">
        <form className="wl-card wl-form-card" onSubmit={handleSubmit}>
          <div className="wl-card-header">
            <div>
              <h2>Log details</h2>
              <p>Document the work completed during this week.</p>
            </div>
          </div>

          <div className="wl-grid">
            <label className="wl-field wl-span-2">
              <span>Activities performed</span>
              <textarea
                id="activities_performed"
                name="activities_performed"
                value={formData.activities_performed}
                onChange={handleChange}
                rows={5}
                placeholder="Describe what you worked on this week..."
                required
              />
            </label>

            <label className="wl-field">
              <span>Hours worked</span>
              <input
                type="number"
                id="hours_worked"
                name="hours_worked"
                value={formData.hours_worked}
                onChange={handleChange}
                min="0"
                step="0.5"
                placeholder="40"
                required
              />
            </label>

            <label className="wl-field">
              <span>Skills learned</span>
              <textarea
                id="skills_learned"
                name="skills_learned"
                value={formData.skills_learned}
                onChange={handleChange}
                rows={4}
                placeholder="Tools, methods, or concepts you learned..."
                required
              />
            </label>

            <label className="wl-field">
              <span>Challenges faced</span>
              <textarea
                id="challenges"
                name="challenges"
                value={formData.challenges}
                onChange={handleChange}
                rows={4}
                placeholder="Any blockers or issues encountered..."
              />
            </label>

            <label className="wl-field wl-span-2">
              <span>Solutions implemented</span>
              <textarea
                id="solutions"
                name="solutions"
                value={formData.solutions}
                onChange={handleChange}
                rows={4}
                placeholder="How you addressed the challenges..."
              />
            </label>

            <label className="wl-field">
              <span>Optional image upload</span>
              <input
                type="file"
                id="log_image"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>

            <label className="wl-field">
              <span>Image description</span>
              <input
                type="text"
                id="image_description"
                value={imageDescription}
                onChange={(e) => setImageDescription(e.target.value)}
                placeholder="Short caption for the upload"
              />
            </label>
          </div>

          {imagePreviewUrl && (
            <div className="wl-preview">
              <span>Attachment preview</span>
              <img src={imagePreviewUrl} alt="Selected upload" />
            </div>
          )}

          {error && <div className="wl-message error">{error}</div>}

          <div className="wl-actions">
            <button type="submit" className="wl-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {existingLog && existingLog.status === 'draft' && (
              <button type="button" onClick={handleSubmitForReview} className="wl-btn-secondary">
                Submit for Review
              </button>
            )}
          </div>
        </form>

        <aside className="wl-card wl-side-card">
          <h3>Placement summary</h3>
          <div className="wl-summary-list">
            <div>
              <span>Organization</span>
              <strong>{placement.organization.name}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{placement.status}</strong>
            </div>
            <div>
              <span>Start date</span>
              <strong>{placement.start_date || 'N/A'}</strong>
            </div>
            <div>
              <span>End date</span>
              <strong>{placement.end_date || 'N/A'}</strong>
            </div>
          </div>

          <div className="wl-side-note">
            Save as a draft first, then submit once the week is complete.
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WeeklyLogForm;