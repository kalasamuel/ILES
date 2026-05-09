import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../services/endpoints';
import { FiXCircle } from 'react-icons/fi';
import './DeadlinesPage.css';

const EMPTY_FORM = {
  week_number: '',
  submission_deadline: '',
};

function toDateValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await notificationsAPI.getDeadlines();
        setDeadlines(response?.results || response || []);
      } catch (error) {
        console.error('Failed to load deadlines', error);
        setMessage('Failed to load deadlines.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredDeadlines = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return deadlines;
    return deadlines.filter((item) => {
      const week = String(item.week_number || '').toLowerCase();
      const deadline = String(item.submission_deadline || '').toLowerCase();
      return week.includes(normalized) || deadline.includes(normalized);
    });
  }, [deadlines, searchTerm]);

  const sortedDeadlines = useMemo(() => {
    return [...filteredDeadlines].sort(
      (a, b) => Number(a.week_number || 0) - Number(b.week_number || 0)
    );
  }, [filteredDeadlines]);

  const upcomingCount = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return deadlines.filter((item) => {
      const date = new Date(item.submission_deadline);
      return !Number.isNaN(date.getTime()) && date >= now;
    }).length;
  }, [deadlines]);

  const overdueCount = deadlines.length - upcomingCount;

  const openCreateEditor = () => {
    setEditorMode('create');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage('');
    setEditorOpen(true);
  };

  const openEditEditor = (deadline) => {
    setEditorMode('edit');
    setEditingId(deadline.deadline_id);
    setForm({
      week_number: String(deadline.week_number || ''),
      submission_deadline: toDateValue(deadline.submission_deadline),
    });
    setMessage('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.week_number || !form.submission_deadline) {
      setMessage('Week number and submission deadline are required.');
      return;
    }
    setSaving(true);
    setMessage('');
    const payload = {
      week_number: Number(form.week_number),
      submission_deadline: form.submission_deadline,
    };
    try {
      if (editorMode === 'create') {
        const created = await notificationsAPI.createDeadline(payload);
        setDeadlines((current) => [created, ...current]);
        setMessage('Deadline created successfully.');
      } else if (editingId) {
        const updated = await notificationsAPI.updateDeadline(editingId, payload);
        setDeadlines((current) =>
          current.map((item) => (item.deadline_id === updated.deadline_id ? updated : item))
        );
        setMessage('Deadline updated successfully.');
      }
      setEditorOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error('Failed to save deadline', error);
      setMessage('Failed to save deadline. Please ensure each week number is unique.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deadline) => {
    const confirmed = window.confirm(`Delete deadline for week ${deadline.week_number}?`);
    if (!confirmed) return;
    setMessage('');
    try {
      await notificationsAPI.deleteDeadline(deadline.deadline_id);
      setDeadlines((current) =>
        current.filter((item) => item.deadline_id !== deadline.deadline_id)
      );
      setMessage('Deadline deleted successfully.');
    } catch (error) {
      console.error('Failed to delete deadline', error);
      setMessage('Failed to delete deadline.');
    }
  };

  return (
    <div className="deadlines-page">

      {/* ── Header ── */}
      <div className="deadlines-header">
        <div>
          <h2>Submission Deadlines</h2>
          <p>Manage weekly logbook submission deadlines.</p>
        </div>
        <div className="deadlines-header-actions">
          <button
            type="button"
            className="deadlines-button deadlines-button-primary"
            onClick={openCreateEditor}
          >
            + Add Deadline
          </button>
          <Link to="/app/dashboard" className="deadlines-back-btn">
            <span className="deadlines-back-arrow">←</span>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {message && <div className="deadlines-message">{message}</div>}

      <div className="deadlines-grid">

        {/* ── Table Card ── */}
        <div className="deadlines-card">
          <h3>All Deadlines</h3>
          <p style={{ marginBottom: '1.25rem' }}>
            {loading ? 'Loading…' : `${sortedDeadlines.length} deadline${sortedDeadlines.length !== 1 ? 's' : ''} found`}
          </p>

          <div className="deadlines-controls">
            <input
              className="deadlines-input"
              placeholder="Search by week number or date…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="deadlines-empty">Loading deadlines…</p>
          ) : sortedDeadlines.length === 0 ? (
            <p className="deadlines-empty">No deadlines match your search.</p>
          ) : (
            <div className="deadlines-table-wrap">
              <table className="deadlines-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Submission Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDeadlines.map((item) => {
                    const date = new Date(item.submission_deadline);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const status =
                      !Number.isNaN(date.getTime()) && date >= today ? 'upcoming' : 'overdue';

                    return (
                      <tr key={item.deadline_id}>
                        <td>
                          <div className="week-cell">
                            <span className="week-badge">{item.week_number}</span>
                            <span className="week-label">Week {item.week_number}</span>
                          </div>
                        </td>
                        <td>{formatDate(item.submission_deadline)}</td>
                        <td>
                          <span className={`deadlines-status ${status}`}>{status}</span>
                        </td>
                        <td>
                          <div className="deadlines-actions">
                            <button
                              type="button"
                              className="deadlines-button deadlines-button-secondary"
                              onClick={() => openEditEditor(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="deadlines-button deadlines-button-danger"
                              onClick={() => handleDelete(item)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Summary Card ── */}
        <div className="deadlines-card deadlines-card-side">
          <h3>Summary</h3>
          <p>Weekly submission schedule health.</p>
          <ul className="deadlines-summary-list">
            <li className="summary-item">
              <span className="summary-label">Total deadlines</span>
              <span className="summary-value accent">{deadlines.length}</span>
            </li>
            <li className="summary-item">
              <span className="summary-label">Upcoming</span>
              <span className="summary-value upcoming">{upcomingCount}</span>
            </li>
            <li className="summary-item">
              <span className="summary-label">Overdue</span>
              <span className="summary-value overdue">{overdueCount}</span>
            </li>
            <li className="summary-item">
              <span className="summary-label">Visible in filter</span>
              <span className="summary-value">{sortedDeadlines.length}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Modal ── */}
      {editorOpen && (
        <div className="deadlines-modal-backdrop">
          <div className="deadlines-modal">
            <div className="deadlines-modal-header">
              <div>
                <h3>{editorMode === 'create' ? 'Add Deadline' : 'Edit Deadline'}</h3>
                <p>Set the week number and submission due date.</p>
              </div>
              <button
                type="button"
                className="deadlines-link-button"
                onClick={closeEditor}
              >
                <FiXCircle aria-hidden="true" /> Close
              </button>
            </div>

            <div className="deadlines-form-grid">
              <label>
                Week Number
                <input
                  className="deadlines-input"
                  type="number"
                  min="1"
                  placeholder="e.g. 4"
                  value={form.week_number}
                  onChange={(e) => setForm({ ...form, week_number: e.target.value })}
                />
              </label>
              <label>
                Submission Deadline
                <input
                  className="deadlines-input"
                  type="date"
                  value={form.submission_deadline}
                  onChange={(e) => setForm({ ...form, submission_deadline: e.target.value })}
                />
              </label>
            </div>

            <div className="deadlines-modal-actions">
              <button
                type="button"
                className="deadlines-button deadlines-button-ghost"
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button
                type="button"
                className="deadlines-button deadlines-button-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeadlinesPage;