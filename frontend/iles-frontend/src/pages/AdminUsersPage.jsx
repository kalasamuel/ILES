import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { rolesAPI, usersAPI, studentsAPI, supervisorsAPI } from '../services/endpoints';
import { FiXCircle, FiCheckSquare, FiUserPlus } from 'react-icons/fi';
import MaskedUserName from '../components/users/MaskedUserName';
import MaskedContact from '../components/users/MaskedContact';
import './AdminUsersPage.css';

const ROLE_PERMISSIONS = {
  admin: ['Full system access', 'Manage users', 'View reports', 'Monitor system status'],
  student: ['View placements', 'Submit logs', 'View results'],
  workplace_supervisor: ['Review logs', 'View assigned students', 'Generate reports'],
  academic_supervisor: ['Evaluate students', 'View placements', 'Generate reports'],
};

function getInitials(firstName, lastName) {
  return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [academicSupervisors, setAcademicSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');

  // Bulk assignment state
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentSupervisorId, setAssignmentSupervisorId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, rolesRes, supervisorsRes] = await Promise.all([
          usersAPI.getUsers(),
          rolesAPI.getRoles(),
          supervisorsAPI.getSupervisors(),
        ]);
        setUsers(usersRes?.results || usersRes || []);
        setRoles(rolesRes?.results || rolesRes || []);
        
        const academic = (supervisorsRes?.results || supervisorsRes || []).filter(
          s => s.supervisor_type === 'academic'
        );
        setAcademicSupervisors(academic);
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

  const selectedStudents = useMemo(() => {
    return filteredUsers.filter(u => 
      selectedUserIds.includes(u.user_id) && 
      u.role?.role_name?.toLowerCase() === 'student'
    );
  }, [filteredUsers, selectedUserIds]);

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
      setUsers((current) =>
        current.map((user) => (user.user_id === updated.user_id ? updated : user))
      );
      setSelectedUser(null);
      setMessage('User updated successfully.');
    } catch (error) {
      console.error('Failed to update user', error);
      setMessage('Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedStudents.length === 0 || !assignmentSupervisorId) return;
    
    setSaving(true);
    setMessage('');
    try {
      // We need student_ids (from Student model) not user_ids.
      const studentIds = selectedStudents.map(u => u.student?.student_id).filter(Boolean);
      
      if (studentIds.length === 0) {
        setMessage('Selected users do not have student profiles.');
        setSaving(false);
        return;
      }

      await studentsAPI.bulkAssignSupervisor(studentIds, assignmentSupervisorId);
      
      // Refresh users to show updated assignments if needed
      const usersRes = await usersAPI.getUsers();
      setUsers(usersRes?.results || usersRes || []);
      
      setSelectedUserIds([]);
      setIsAssigning(false);
      setAssignmentSupervisorId('');
      setMessage(`Successfully assigned supervisor to ${studentIds.length} students.`);
    } catch (error) {
      console.error('Failed to bulk assign supervisor', error);
      setMessage('Failed to assign supervisor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-users-page">

      {/* ── Header ── */}
      <div className="admin-users-header">
        <div>
          <h2>Manage Users</h2>
          <p>Update roles, account status, and permissions.</p>
        </div>
        <Link to="/app/dashboard" className="admin-back-btn">
          <span className="admin-back-arrow">←</span>
          Back to Dashboard
        </Link>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <div className="admin-users-grid">

        {/* ── Users Table Card ── */}
        <div className="admin-card">
          <div className="admin-card-header-flex">
            <h3>All Users</h3>
            {selectedStudents.length > 0 && (
              <div className="bulk-actions">
                <span className="selection-count">{selectedStudents.length} selected</span>
                <button 
                  className="admin-button admin-button-primary admin-button-sm"
                  onClick={() => setIsAssigning(true)}
                >
                  <FiUserPlus style={{ marginRight: '4px' }} />
                  Assign Supervisor
                </button>
              </div>
            )}
          </div>
          <p>{loading ? 'Loading...' : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}</p>

          <div className="admin-controls">
            <input
              className="admin-input"
              placeholder="Search by name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="admin-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All roles</option>
              {roles.map((role) => {
                const value = String(role.role_name || '').toLowerCase().replace(/[\s-]+/g, '_');
                return (
                  <option key={role.role_id} value={value}>
                    {role.role_name}
                  </option>
                );
              })}
            </select>
          </div>

          {loading ? (
            <p className="admin-empty">Loading users…</p>
          ) : filteredUsers.length === 0 ? (
            <p className="admin-empty">No users match your search.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}><FiCheckSquare /></th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isStudent = user.role?.role_name?.toLowerCase() === 'student';
                    return (
                      <tr key={user.user_id}>
                        <td>
                          {isStudent && (
                            <input 
                              type="checkbox"
                              checked={selectedUserIds.includes(user.user_id)}
                              onChange={() => toggleUserSelection(user.user_id)}
                            />
                          )}
                        </td>
                        <td>
                          <div className="user-cell">
                            <span className="user-avatar">
                              {getInitials(user.first_name, user.last_name)}
                            </span>
                            <div>
                              <div className="user-name"><MaskedUserName user={user} fallback={`${user.email || 'User'}`} /></div>
                              <div className="user-email">{user.email}</div>
                              <div className="user-phone"><MaskedContact user={user} fallback="" /></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-role">
                            {user.role?.role_name || 'Unassigned'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${user.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => openEditor(user)}
                            className="admin-button admin-button-secondary"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Permissions Sidebar Card ── */}
        <div className="admin-card admin-card-side">
          <h3>Permissions Overview</h3>
          <p>Role-based permissions in the system.</p>
          <div className="admin-permissions-list">
            {Object.entries(ROLE_PERMISSIONS).map(([roleKey, permissions]) => (
              <div key={roleKey} className="admin-permission-card">
                <div className="admin-permission-title">{roleKey.replace(/_/g, ' ')}</div>
                <ul>
                  {permissions.map((permission) => (
                    <li key={permission}>{permission}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Bulk Assignment Modal ── */}
      {isAssigning && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <h3>Assign Academic Supervisor</h3>
                <p>Assigning a supervisor for {selectedStudents.length} students.</p>
              </div>
              <button
                type="button"
                className="admin-link-button"
                onClick={() => setIsAssigning(false)}
              >
                <FiXCircle aria-hidden="true" /> Close
              </button>
            </div>

            <div className="admin-form-grid">
              <label className="admin-form-full">
                Choose Academic Supervisor
                <select 
                  className="admin-select"
                  value={assignmentSupervisorId}
                  onChange={(e) => setAssignmentSupervisorId(e.target.value)}
                >
                  <option value="">Select a supervisor...</option>
                  {academicSupervisors.map(superv => (
                    <option key={superv.supervisor_id} value={superv.supervisor_id}>
                      {superv.user_details?.first_name} {superv.user_details?.last_name} ({superv.department_name || 'No Dept'})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-button admin-button-ghost"
                onClick={() => setIsAssigning(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAssign}
                disabled={saving || !assignmentSupervisorId}
                className="admin-button admin-button-primary"
              >
                {saving ? 'Assigning…' : 'Assign to Students'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {selectedUser && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <h3>Edit User</h3>
                <p>Update account details, role, and status.</p>
              </div>
              <button
                type="button"
                className="admin-link-button"
                onClick={() => setSelectedUser(null)}
              >
                <FiXCircle aria-hidden="true" /> Close
              </button>
            </div>

            <div className="admin-form-grid">
              <label>
                First name
                <input
                  className="admin-input"
                  value={selectedUser.first_name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, first_name: e.target.value })}
                />
              </label>
              <label>
                Last name
                <input
                  className="admin-input"
                  value={selectedUser.last_name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, last_name: e.target.value })}
                />
              </label>
              <label className="admin-form-full">
                Email address
                <input
                  className="admin-input"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                />
              </label>
              <label>
                Phone number
                <input
                  className="admin-input"
                  value={selectedUser.phone_number}
                  onChange={(e) => setSelectedUser({ ...selectedUser, phone_number: e.target.value })}
                />
              </label>
              <label>
                Role
                <select
                  className="admin-select"
                  value={selectedUser.role_id}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role_id: e.target.value })}
                >
                  {roles.map((role) => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-checkbox-row admin-form-full">
                <input
                  type="checkbox"
                  checked={selectedUser.is_active}
                  onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.checked })}
                />
                Account is active
              </label>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-button admin-button-ghost"
                onClick={() => setSelectedUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="admin-button admin-button-primary"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminUsersPage;