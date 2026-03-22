import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/AuthContext';
import './SettingsPage.css';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Profile Settings
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: true,
    log_reminders: true,
    review_alerts: true,
    weekly_summary: false,
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    profile_visible: true,
    show_email: false,
    show_phone: false,
  });

  // Password Change
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
      // Call your API here
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
      // Call your API here
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
      // Call your API here
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
      // Call your API here
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
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'password', label: 'Password', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🛡️' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account preferences and security</p>
      </div>

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="settings-container">
        {/* Sidebar Tabs */}
        <div className="settings-sidebar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="settings-form">
              <h2>Profile Information</h2>
              <p className="form-description">Update your personal information</p>

              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  placeholder="Enter your first name"
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  placeholder="Enter your last name"
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  placeholder="Enter your department"
                />
              </div>

              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate} className="settings-form">
              <h2>Change Password</h2>
              <p className="form-description">Update your password to keep your account secure</p>

              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="Enter your current password"
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
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <p className="form-description">Choose how you want to be notified</p>

              <div className="toggle-group">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Email Notifications</span>
                    <span className="toggle-description">Receive updates via email</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.email_notifications}
                      onChange={(e) => setNotifications({ ...notifications, email_notifications: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Push Notifications</span>
                    <span className="toggle-description">Receive browser notifications</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.push_notifications}
                      onChange={(e) => setNotifications({ ...notifications, push_notifications: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Log Reminders</span>
                    <span className="toggle-description">Get reminded to submit weekly logs</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.log_reminders}
                      onChange={(e) => setNotifications({ ...notifications, log_reminders: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Review Alerts</span>
                    <span className="toggle-description">Get notified when logs are reviewed</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.review_alerts}
                      onChange={(e) => setNotifications({ ...notifications, review_alerts: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Weekly Summary</span>
                    <span className="toggle-description">Receive weekly progress summary</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.weekly_summary}
                      onChange={(e) => setNotifications({ ...notifications, weekly_summary: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <button onClick={handleNotificationUpdate} className="btn-save" disabled={loading}>
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy Settings</h2>
              <p className="form-description">Control who can see your information</p>

              <div className="toggle-group">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Profile Visibility</span>
                    <span className="toggle-description">Allow others to view your profile</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={privacy.profile_visible}
                      onChange={(e) => setPrivacy({ ...privacy, profile_visible: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Show Email</span>
                    <span className="toggle-description">Display email on your profile</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={privacy.show_email}
                      onChange={(e) => setPrivacy({ ...privacy, show_email: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <span className="toggle-label">Show Phone</span>
                    <span className="toggle-description">Display phone number on your profile</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={privacy.show_phone}
                      onChange={(e) => setPrivacy({ ...privacy, show_phone: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <button onClick={handlePrivacyUpdate} className="btn-save" disabled={loading}>
                {loading ? 'Saving...' : 'Save Privacy Settings'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;