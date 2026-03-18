import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import { WeeklyLogForm as WeeklyLogFormType, WeeklyLog, InternshipPlacement, WeeklyLogCreateUpdate } from '../types';
import * as api from '../services/api';

const WeeklyLogForm: React.FC = () => {
  const { placementId, weekNumber } = useParams<{ placementId: string; weekNumber?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<WeeklyLogFormType>({
    activities_performed: '',
    skills_learned: '',
    challenges: '',
    solutions: '',
    hours_worked: 0,
  });

  const [placement, setPlacement] = useState<InternshipPlacement | null>(null);
  const [existingLog, setExistingLog] = useState<WeeklyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!placementId) return;

      try {
        const placementRes = await api.placementsAPI.getPlacement(placementId);
        setPlacement(placementRes);

        if (weekNumber) {
          // Try to load existing log
          const logsRes = await api.logbooksAPI.getLogs();
          const existing = logsRes.results.find(
            (log: WeeklyLog) => log.placement.placement_id === placementId && log.week_number === parseInt(weekNumber)
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
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [placementId, weekNumber]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'hours_worked' ? parseFloat(value) || 0 : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placement) return;

    setSaving(true);
    setError('');

    try {
      const logData: WeeklyLogCreateUpdate = {
        placement: placement.placement_id,
        week_number: weekNumber ? parseInt(weekNumber) : 1,
        start_date: new Date().toISOString().split('T')[0], // Would be calculated properly
        end_date: new Date().toISOString().split('T')[0],   // Would be calculated properly
        activities_performed: formData.activities_performed,
        skills_learned: formData.skills_learned,
        challenges: formData.challenges,
        solutions: formData.solutions,
        hours_worked: formData.hours_worked,
      };

      if (existingLog) {
        await api.logbooksAPI.updateLog(existingLog.log_id, logData);
      } else {
        await api.logbooksAPI.createLog(logData);
      }

      navigate('/student');
    } catch (err) {
      setError('Failed to save log');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!existingLog) return;

    try {
      await api.logbooksAPI.submitLog(existingLog.log_id);
      navigate('/student');
    } catch (err) {
      setError('Failed to submit log');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
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