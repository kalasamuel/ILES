import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { rolesAPI, usersAPI } from '../services/endpoints';
import './AdminUsersPage.css';

const ROLE_PERMISSIONS = {
  admin: ['Full system access', 'Manage users', 'View reports', 'Monitor system status'],
  student: ['View placements', 'Submit logs', 'View results'],
  workplace_supervisor: ['Review logs', 'View assigned students', 'Generate reports'],
  academic_supervisor: ['Evaluate students', 'View placements', 'Generate reports'],
};

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          usersAPI.getUsers(),
          rolesAPI.getRoles(),
        ]);

        setUsers(usersRes?.results || usersRes || []);
        setRoles(rolesRes?.results || rolesRes || []);
      } catch (error) {
        console.error('Failed to fetch admin users data', error);
        setMessage('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const roleName = String(user?.role?.role_name || '').toLowerCase().replace(/[\s-]+/g, '_');
      const matchesRole = roleFilter === 'all' || roleName === roleFilter;
      const haystack = `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, roleFilter]);

  const openEditor = (user) => {
    setSelectedUser({
      user_id: user.user_id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      role_id: user.role?.role_id || '',
      is_active: Boolean(user.is_active),
    });
    setMessage('');
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setMessage('');
    try {
      const updated = await usersAPI.updateUser(selectedUser.user_id, {
        first_name: selectedUser.first_name,
        last_name: selectedUser.last_name,
        email: selectedUser.email,
        phone_number: selectedUser.phone_number,
        role_id: selectedUser.role_id,
        is_active: selectedUser.is_active,
      });

      setUsers((current) => current.map((user) => (user.user_id === updated.user_id ? updated : user)));
      setSelectedUser(null);
      setMessage('User updated successfully.');
    } catch (error) {
      console.error('Failed to update user', error);
      setMessage('Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-users-page">
      <div className="admin-users-header">
        <div>
          <h2>Manage Users</h2>
          <p>Update roles, account status, and permissions.</p>
        </div>
        <Link to="/app/dashboard" className="admin-link">Back to Dashboard</Link>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <div className="admin-users-grid">
        <div className="admin-card">
          <div className="admin-controls">
            <input
              className="admin-input"
              placeholder="Search users by name or email"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="admin-select"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">All roles</option>
              {roles.map((role) => {
                const value = String(role.role_name || '').toLowerCase().replace(/[\s-]+/g, '_');
                return <option key={role.role_id} value={value}>{role.role_name}</option>;
              })}
            </select>
          </div>

          {loading ? (
            <p className="text-zinc-500 py-8">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="admin-empty">No users found.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr className="text-left text-zinc-500 border-b border-zinc-200">
                    <th className="py-3 pr-4">User</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Joined</th>
                    <th className="py-3 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-zinc-900">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-zinc-500">{user.email}</div>
                      </td>
                      <td className="py-3 pr-4">{user.role?.role_name || 'Unassigned'}</td>
                      <td className="py-3 pr-4">{user.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="py-3 pr-4">{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => openEditor(user)}
                          className="admin-button admin-button-secondary"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-card admin-card-side">
          <h3>Permissions Overview</h3>
          <p>Role-based permissions available in the system.</p>
          <div className="admin-permissions-list">
            {Object.entries(ROLE_PERMISSIONS).map(([roleKey, permissions]) => (
              <div key={roleKey} className="admin-permission-card">
                <div className="admin-permission-title">{roleKey.replace('_', ' ')}</div>
                <ul>
                  {permissions.map((permission) => <li key={permission}>• {permission}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <h3>Edit User</h3>
                <p>Update account details, role, and activation status.</p>
              </div>
              <button type="button" className="admin-link-button" onClick={() => setSelectedUser(null)}>Close</button>
            </div>

            <div className="admin-form-grid">
              <label>
                First name
                <input
                  className="admin-input"
                  value={selectedUser.first_name}
                  onChange={(event) => setSelectedUser({ ...selectedUser, first_name: event.target.value })}
                />
              </label>
              <label>
                Last name
                <input
                  className="admin-input"
                  value={selectedUser.last_name}
                  onChange={(event) => setSelectedUser({ ...selectedUser, last_name: event.target.value })}
                />
              </label>
              <label className="admin-form-full">
                Email
                <input
                  className="admin-input"
                  value={selectedUser.email}
                  onChange={(event) => setSelectedUser({ ...selectedUser, email: event.target.value })}
                />
              </label>
              <label>
                Phone number
                <input
                  className="admin-input"
                  value={selectedUser.phone_number}
                  onChange={(event) => setSelectedUser({ ...selectedUser, phone_number: event.target.value })}
                />
              </label>
              <label>
                Role
                <select
                  className="admin-select"
                  value={selectedUser.role_id}
                  onChange={(event) => setSelectedUser({ ...selectedUser, role_id: event.target.value })}
                >
                  {roles.map((role) => (
                    <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
                  ))}
                </select>
              </label>
              <label className="admin-checkbox-row admin-form-full">
                <input
                  type="checkbox"
                  checked={selectedUser.is_active}
                  onChange={(event) => setSelectedUser({ ...selectedUser, is_active: event.target.checked })}
                />
                Account active
              </label>
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="admin-button admin-button-ghost" onClick={() => setSelectedUser(null)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="admin-button admin-button-primary"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
