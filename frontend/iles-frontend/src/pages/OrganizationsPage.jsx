import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { organizationsAPI } from '../services/endpoints';
import './OrganizationsPage.css';

const EMPTY_FORM = {
  name: '',
  industry: '',
  address: '',
  city: '',
  country: '',
  contact_email: '',
  contact_phone: '',
};

function OrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [editorMode, setEditorMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await organizationsAPI.getOrganizations();
        setOrganizations(response?.results || response || []);
      } catch (error) {
        console.error('Failed to load organizations', error);
        setMessage('Failed to load organizations.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const industries = useMemo(() => {
    return Array.from(new Set(
      organizations
        .map((organization) => String(organization.industry || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
  }, [organizations]);

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((organization) => {
      const haystack = [
        organization.name,
        organization.industry,
        organization.city,
        organization.country,
        organization.contact_email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesIndustry = selectedIndustry === 'all' || organization.industry === selectedIndustry;

      return matchesSearch && matchesIndustry;
    });
  }, [organizations, searchTerm, selectedIndustry]);

  const openCreateEditor = () => {
    setEditorMode('create');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage('');
    setIsEditorOpen(true);
  };

  const openEditEditor = (organization) => {
    setEditorMode('edit');
    setEditingId(organization.organization_id);
    setForm({
      name: organization.name || '',
      industry: organization.industry || '',
      address: organization.address || '',
      city: organization.city || '',
      country: organization.country || '',
      contact_email: organization.contact_email || '',
      contact_phone: organization.contact_phone || '',
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
    setSaving(true);
    setMessage('');
    try {
      if (editorMode === 'create') {
        const created = await organizationsAPI.createOrganization(form);
        setOrganizations((current) => [created, ...current]);
        setMessage('Organization created successfully.');
      } else if (editingId) {
        const updated = await organizationsAPI.updateOrganization(editingId, form);
        setOrganizations((current) => current.map((item) => (
          item.organization_id === updated.organization_id ? updated : item
        )));
        setMessage('Organization updated successfully.');
      }

      setIsEditorOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error('Failed to save organization', error);
      setMessage('Failed to save organization. Please check all fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (organization) => {
    const confirmed = window.confirm(`Delete ${organization.name}? This action cannot be undone.`);
    if (!confirmed) return;

    setMessage('');
    try {
      await organizationsAPI.deleteOrganization(organization.organization_id);
      setOrganizations((current) => current.filter((item) => item.organization_id !== organization.organization_id));
      setMessage('Organization deleted successfully.');
    } catch (error) {
      console.error('Failed to delete organization', error);
      setMessage('Failed to delete organization.');
    }
  };

  return (
    <div className="organizations-page">
      <div className="organizations-header">
        <div>
          <h2>Organizations</h2>
          <p>Manage internship partner organizations and contact details.</p>
        </div>
        <div className="organizations-header-actions">
          <button type="button" className="organizations-button organizations-button-primary" onClick={openCreateEditor}>
            + Add Organization
          </button>
          <Link to="/app/dashboard" className="organizations-link">Back to Dashboard</Link>
        </div>
      </div>

      {message && <div className="organizations-message">{message}</div>}

      <div className="organizations-grid">
        <div className="organizations-card">
          <div className="organizations-controls">
            <input
              className="organizations-input"
              placeholder="Search organizations"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="organizations-select"
              value={selectedIndustry}
              onChange={(event) => setSelectedIndustry(event.target.value)}
            >
              <option value="all">All industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="organizations-empty">Loading organizations...</p>
          ) : filteredOrganizations.length === 0 ? (
            <p className="organizations-empty">No organizations found.</p>
          ) : (
            <div className="organizations-table-wrap">
              <table className="organizations-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganizations.map((organization) => (
                    <tr key={organization.organization_id}>
                      <td>
                        <div className="organizations-name">{organization.name}</div>
                        <div className="organizations-subtext">{organization.address}</div>
                      </td>
                      <td>{organization.industry}</td>
                      <td>{organization.city}, {organization.country}</td>
                      <td>
                        <div>{organization.contact_email}</div>
                        <div className="organizations-subtext">{organization.contact_phone}</div>
                      </td>
                      <td>
                        <div className="organizations-actions">
                          <button
                            type="button"
                            className="organizations-button organizations-button-secondary"
                            onClick={() => openEditEditor(organization)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="organizations-button organizations-button-danger"
                            onClick={() => handleDelete(organization)}
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

        <div className="organizations-card organizations-card-side">
          <h3>Summary</h3>
          <p>Quick overview of partner organization coverage.</p>
          <ul className="organizations-summary-list">
            <li>Total organizations: <strong>{organizations.length}</strong></li>
            <li>Industries covered: <strong>{industries.length}</strong></li>
            <li>Visible in current filter: <strong>{filteredOrganizations.length}</strong></li>
          </ul>
        </div>
      </div>

      {isEditorOpen && (
        <div className="organizations-modal-backdrop">
          <div className="organizations-modal">
            <div className="organizations-modal-header">
              <div>
                <h3>{editorMode === 'create' ? 'Add Organization' : 'Edit Organization'}</h3>
                <p>Provide organization profile and contact information.</p>
              </div>
              <button type="button" className="organizations-link-button" onClick={closeEditor}>Close</button>
            </div>

            <div className="organizations-form-grid">
              <label>
                Name
                <input
                  className="organizations-input"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label>
                Industry
                <input
                  className="organizations-input"
                  value={form.industry}
                  onChange={(event) => setForm({ ...form, industry: event.target.value })}
                />
              </label>
              <label>
                City
                <input
                  className="organizations-input"
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                />
              </label>
              <label>
                Country
                <input
                  className="organizations-input"
                  value={form.country}
                  onChange={(event) => setForm({ ...form, country: event.target.value })}
                />
              </label>
              <label className="organizations-form-full">
                Address
                <input
                  className="organizations-input"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </label>
              <label>
                Contact email
                <input
                  className="organizations-input"
                  type="email"
                  value={form.contact_email}
                  onChange={(event) => setForm({ ...form, contact_email: event.target.value })}
                />
              </label>
              <label>
                Contact phone
                <input
                  className="organizations-input"
                  value={form.contact_phone}
                  onChange={(event) => setForm({ ...form, contact_phone: event.target.value })}
                />
              </label>
            </div>

            <div className="organizations-modal-actions">
              <button type="button" className="organizations-button organizations-button-ghost" onClick={closeEditor}>
                Cancel
              </button>
              <button type="button" className="organizations-button organizations-button-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationsPage;