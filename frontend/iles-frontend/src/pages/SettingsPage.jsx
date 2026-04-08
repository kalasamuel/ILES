import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/AuthContext';
import './SettingsPage.css';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
  });

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: true,
    log_reminders: true,
    review_alerts: true,
    weekly_summary: false,
  });

  const [privacy, setPrivacy] = useState({
    profile_visible: true,
    show_email: false,
    show_phone: false,
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    try {
      // await api.userAPI.updateProfile(profile);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // await api.userAPI.changePassword(passwordData);
      setSuccess('Password changed successfully!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    try {
      // await api.userAPI.updateNotifications(notifications);
      setSuccess('Notification preferences saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyUpdate = async () => {
    setLoading(true);
    try {
      // await api.userAPI.updatePrivacy(privacy);
      setSuccess('Privacy settings saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating privacy:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile',       label: 'Profile',       icon: '👤' },
    { id: 'password',      label: 'Password',       icon: '🔒' },
    { id: 'notifications', label: 'Notifications',  icon: '🔔' },
    { id: 'privacy',       label: 'Privacy',        icon: '🛡️' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account preferences and security</p>
      </div>

      {success && (
        <div className="success-message">{success}</div>
      )}

      <div className="settings-container">

        {/* ── Tab Sidebar ── */}
        <div className="settings-sidebar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon-wrap">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content Panel ── */}
        <div className="settings-content">

          {/* Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="settings-form">
              <h2>Profile Information</h2>
              <p className="form-description">Update your personal details below</p>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    placeholder="First name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+256 700 000 000"
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  placeholder="e.g. Computer Science"
                />
              </div>

              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* Password */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="settings-form">
              <h2>Change Password</h2>
              <p className="form-description">Keep your account secure with a strong password</p>

              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <p className="form-description">Choose how and when you want to be notified</p>

              <div className="toggle-group">
                {[
                  { key: 'email_notifications', label: 'Email Notifications', desc: 'Receive updates via email' },
                  { key: 'push_notifications',  label: 'Push Notifications',  desc: 'Receive browser notifications' },
                  { key: 'log_reminders',       label: 'Log Reminders',       desc: 'Get reminded to submit weekly logs' },
                  { key: 'review_alerts',       label: 'Review Alerts',       desc: 'Get notified when logs are reviewed' },
                  { key: 'weekly_summary',      label: 'Weekly Summary',      desc: 'Receive a weekly progress summary' },
                ].map(({ key, label, desc }) => (
                  <div className="toggle-item" key={key}>
                    <div className="toggle-info">
                      <span className="toggle-label">{label}</span>
                      <span className="toggle-description">{desc}</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications[key]}
                        onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>

              <button onClick={handleNotificationUpdate} className="btn-save" disabled={loading}>
                {loading ? 'Saving…' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* Privacy */}
          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy Settings</h2>
              <p className="form-description">Control who can see your information</p>

              <div className="toggle-group">
                {[
                  { key: 'profile_visible', label: 'Profile Visibility', desc: 'Allow others to view your profile' },
                  { key: 'show_email',      label: 'Show Email',         desc: 'Display your email on your profile' },
                  { key: 'show_phone',      label: 'Show Phone',         desc: 'Display your phone number on your profile' },
                ].map(({ key, label, desc }) => (
                  <div className="toggle-item" key={key}>
                    <div className="toggle-info">
                      <span className="toggle-label">{label}</span>
                      <span className="toggle-description">{desc}</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={privacy[key]}
                        onChange={(e) => setPrivacy({ ...privacy, [key]: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>

              <button onClick={handlePrivacyUpdate} className="btn-save" disabled={loading}>
                {loading ? 'Saving…' : 'Save Privacy Settings'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;