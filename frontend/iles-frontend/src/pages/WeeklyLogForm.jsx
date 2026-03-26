import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { logbooksAPI, placementsAPI } from '../services/endpoints';

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
    if (!placement) return;

    setSaving(true);
    setError('');

    try {
      const logData = {
        placement: placement.placement_id,
        week_number: weekNumber ? parseInt(weekNumber) : 1,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
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
    return <div>Loading...</div>;
  }

  if (!placementId) {
    return (
      <div className="weekly-log-form">
        <header className="form-header">
          <h2>Create Weekly Log</h2>
          <p>Select a placement to continue</p>
        </header>

        <div className="form-group">
          <label htmlFor="placement">Placement:</label>
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
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="button" onClick={handlePlacementContinue} disabled={!selectedPlacementId}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (!placement) {
    return <div>Placement not found</div>;
  }

  return (
    <div className="weekly-log-form">
      <header className="form-header">
        <h2>Weekly Log - Week {weekNumber || 1}</h2>
        <p>{placement.position_title} at {placement.organization.name}</p>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="activities_performed">Activities Performed:</label>
          <textarea
            id="activities_performed"
            name="activities_performed"
            value={formData.activities_performed}
            onChange={handleChange}
            rows={4}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="skills_learned">Skills Learned:</label>
          <textarea
            id="skills_learned"
            name="skills_learned"
            value={formData.skills_learned}
            onChange={handleChange}
            rows={3}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="challenges">Challenges Faced:</label>
          <textarea
            id="challenges"
            name="challenges"
            value={formData.challenges}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="solutions">Solutions Implemented:</label>
          <textarea
            id="solutions"
            name="solutions"
            value={formData.solutions}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="hours_worked">Hours Worked:</label>
          <input
            type="number"
            id="hours_worked"
            name="hours_worked"
            value={formData.hours_worked}
            onChange={handleChange}
            min="0"
            step="0.5"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="log_image">Optional Image Upload:</label>
          <input
            type="file"
            id="log_image"
            accept="image/*"
            onChange={handleImageChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="image_description">Image Description (optional):</label>
          <input
            type="text"
            id="image_description"
            value={imageDescription}
            onChange={(e) => setImageDescription(e.target.value)}
            placeholder="Brief description of the uploaded image"
          />
        </div>

        {imagePreviewUrl && (
          <div className="form-group">
            <label>Image Preview:</label>
            <div>
              <img src={imagePreviewUrl} alt="Selected upload" style={{ maxWidth: '320px', borderRadius: '6px' }} />
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          {existingLog && existingLog.status === 'draft' && (
            <button type="button" onClick={handleSubmitForReview} className="submit-btn">
              Submit for Review
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default WeeklyLogForm;