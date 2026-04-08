import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { departmentsAPI } from '../services/endpoints';
import './DepartmentsPage.css';

const EMPTY_FORM = {
  department_name: '',
  faculty: '',
  university: '',
};

function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [editorMode, setEditorMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await departmentsAPI.getDepartments();
        setDepartments(response?.results || response || []);
      } catch (error) {
        console.error('Failed to load departments', error);
        setMessage('Failed to load departments.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const universities = useMemo(() => {
    return Array.from(new Set(
      departments
        .map((department) => String(department.university || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((department) => {
      const haystack = [
        department.department_name,
        department.faculty,
        department.university,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesUniversity = selectedUniversity === 'all' || department.university === selectedUniversity;

      return matchesSearch && matchesUniversity;
    });
  }, [departments, searchTerm, selectedUniversity]);

  const openCreateEditor = () => {
    setEditorMode('create');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage('');
    setIsEditorOpen(true);
  };

  const openEditEditor = (department) => {
    setEditorMode('edit');
    setEditingId(department.department_id);
    setForm({
      department_name: department.department_name || '',
      faculty: department.faculty || '',
      university: department.university || '',
    });
    setMessage('');
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setIsEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.department_name || !form.faculty || !form.university) {
      setMessage('Department name, faculty, and university are required.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      if (editorMode === 'create') {
        const created = await departmentsAPI.createDepartment(form);
        setDepartments((current) => [created, ...current]);
        setMessage('Department created successfully.');
      } else if (editingId) {
        const updated = await departmentsAPI.updateDepartment(editingId, form);
        setDepartments((current) => current.map((item) => (
          item.department_id === updated.department_id ? updated : item
        )));
        setMessage('Department updated successfully.');
      }

      setIsEditorOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error('Failed to save department', error);
      setMessage('Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(`Delete ${department.department_name}? This action cannot be undone.`);
    if (!confirmed) return;

    setMessage('');
    try {
      await departmentsAPI.deleteDepartment(department.department_id);
      setDepartments((current) => current.filter((item) => item.department_id !== department.department_id));
      setMessage('Department deleted successfully.');
    } catch (error) {
      console.error('Failed to delete department', error);
      setMessage('Failed to delete department.');
    }
  };

  return (
    <div className="departments-page">
      <div className="departments-header">
        <div>
          <h2>Departments</h2>
          <p>Manage academic departments, faculties, and institutions.</p>
        </div>
        <div className="departments-header-actions">
          <button type="button" className="departments-button departments-button-primary" onClick={openCreateEditor}>
            + Add Department
          </button>
          <Link to="/app/dashboard" className="departments-link">Back to Dashboard</Link>
        </div>
      </div>

      {message && <div className="departments-message">{message}</div>}

      <div className="departments-grid">
        <div className="departments-card">
          <div className="departments-controls">
            <input
              className="departments-input"
              placeholder="Search departments"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="departments-select"
              value={selectedUniversity}
              onChange={(event) => setSelectedUniversity(event.target.value)}
            >
              <option value="all">All universities</option>
              {universities.map((university) => (
                <option key={university} value={university}>{university}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="departments-empty">Loading departments...</p>
          ) : filteredDepartments.length === 0 ? (
            <p className="departments-empty">No departments found.</p>
          ) : (
            <div className="departments-table-wrap">
              <table className="departments-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Faculty</th>
                    <th>University</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((department) => (
                    <tr key={department.department_id}>
                      <td>
                        <div className="departments-name">{department.department_name}</div>
                      </td>
                      <td>{department.faculty}</td>
                      <td>{department.university}</td>
                      <td>
                        <div className="departments-actions">
                          <button
                            type="button"
                            className="departments-button departments-button-secondary"
                            onClick={() => openEditEditor(department)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="departments-button departments-button-danger"
                            onClick={() => handleDelete(department)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="departments-card departments-card-side">
          <h3>Summary</h3>
          <p>Overview of institutional department setup.</p>
          <ul className="departments-summary-list">
            <li>Total departments: <strong>{departments.length}</strong></li>
            <li>Universities covered: <strong>{universities.length}</strong></li>
            <li>Visible in current filter: <strong>{filteredDepartments.length}</strong></li>
          </ul>
        </div>
      </div>

      {isEditorOpen && (
        <div className="departments-modal-backdrop">
          <div className="departments-modal">
            <div className="departments-modal-header">
              <div>
                <h3>{editorMode === 'create' ? 'Add Department' : 'Edit Department'}</h3>
                <p>Provide department profile and institution details.</p>
              </div>
              <button type="button" className="departments-link-button" onClick={closeEditor}>Close</button>
            </div>

            <div className="departments-form-grid">
              <label>
                Department Name
                <input
                  className="departments-input"
                  value={form.department_name}
                  onChange={(event) => setForm({ ...form, department_name: event.target.value })}
                />
              </label>
              <label>
                Faculty
                <input
                  className="departments-input"
                  value={form.faculty}
                  onChange={(event) => setForm({ ...form, faculty: event.target.value })}
                />
              </label>
              <label className="departments-form-full">
                University
                <input
                  className="departments-input"
                  value={form.university}
                  onChange={(event) => setForm({ ...form, university: event.target.value })}
                />
              </label>
            </div>

            <div className="departments-modal-actions">
              <button type="button" className="departments-button departments-button-ghost" onClick={closeEditor}>
                Cancel
              </button>
              <button type="button" className="departments-button departments-button-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentsPage;