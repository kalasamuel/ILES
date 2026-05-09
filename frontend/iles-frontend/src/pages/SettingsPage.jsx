import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/AuthContext';
import { departmentsAPI, usersAPI, notificationsAPI } from '../services/endpoints';
import './SettingsPage.css';

const SettingsPage = () => {
  const { refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [profilePictureError, setProfilePictureError] = useState('');
  const [departments, setDepartments] = useState([]);

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    institution_name: '',
    affiliation_type: '',
    affiliation_name: '',
    department_id: '',
    profile_picture_url: '',
  });
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [removeProfilePicture, setRemoveProfilePicture] = useState(false);

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
    const loadSettings = async () => {
      setLoading(true);
      setError('');

      try {
        const [currentUser, userSettings, departmentsRes] = await Promise.all([
          usersAPI.getCurrentUser(),
          usersAPI.getCurrentUserSettings(),
          departmentsAPI.getDepartments(),
        ]);

        const departmentOptions = departmentsRes?.results || departmentsRes || [];
        setDepartments(departmentOptions);

        setProfile({
          first_name: currentUser?.first_name || '',
          last_name: currentUser?.last_name || '',
          email: currentUser?.email || '',
          phone_number: currentUser?.phone_number || '',
          institution_name: currentUser?.institution_name || '',
          affiliation_type: currentUser?.affiliation_type || '',
          affiliation_name: currentUser?.affiliation_name || '',
          department_id: currentUser?.department?.department_id || '',
          profile_picture_url: currentUser?.profile_picture_url || '',
        });

        setNotifications({
          email_notifications: userSettings?.email_notifications ?? true,
          push_notifications: userSettings?.push_notifications ?? true,
          log_reminders: userSettings?.log_reminders ?? true,
          review_alerts: userSettings?.review_alerts ?? true,
          weekly_summary: userSettings?.weekly_summary ?? false,
        });

        setPrivacy({
          profile_visible: userSettings?.profile_visible ?? true,
          show_email: userSettings?.show_email ?? false,
          show_phone: userSettings?.show_phone ?? false,
        });

      } catch (fetchError) {
        console.error('Error loading settings:', fetchError);
        setError('Failed to load settings from the server.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const clearFeedbackLater = () => {
    window.setTimeout(() => setSuccess(''), 3000);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!String(file.type || '').startsWith('image/')) {
      setProfilePictureError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfilePictureError('Profile picture must be smaller than 5MB.');
      return;
    }

    setProfilePictureError('');
    setError('');
    setProfilePictureFile(file);
    setProfilePicturePreview(URL.createObjectURL(file));
    setRemoveProfilePicture(false);
  };

  const handleRemoveProfilePicture = () => {
    setProfilePictureError('');
    setProfilePictureFile(null);
    setProfilePicturePreview('');
    setRemoveProfilePicture(true);
    setProfile((current) => ({ ...current, profile_picture_url: '' }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSavingAction('profile');
    setSuccess('');
    setError('');
    setProfilePictureError('');
    try {
      const payload = new FormData();
      payload.append('first_name', profile.first_name);
      payload.append('last_name', profile.last_name);
      payload.append('email', profile.email);
      payload.append('phone_number', profile.phone_number);
      payload.append('institution_name', profile.institution_name || '');
      payload.append('department_id', profile.department_id || '');

      if (profilePictureFile) {
        payload.append('profile_picture', profilePictureFile);
      } else if (removeProfilePicture) {
        payload.append('remove_profile_picture', 'true');
      }

      const updatedUser = await usersAPI.updateCurrentUser(payload);

      setProfile((current) => ({
        ...current,
        first_name: updatedUser?.first_name || current.first_name,
        last_name: updatedUser?.last_name || current.last_name,
        email: updatedUser?.email || current.email,
        phone_number: updatedUser?.phone_number || current.phone_number,
        institution_name: updatedUser?.institution_name || '',
        affiliation_type: updatedUser?.affiliation_type || '',
        affiliation_name: updatedUser?.affiliation_name || '',
        department_id: updatedUser?.department?.department_id || '',
        profile_picture_url: updatedUser?.profile_picture_url || '',
      }));
      setProfilePictureFile(null);
      setProfilePicturePreview('');
      setRemoveProfilePicture(false);
      setProfilePictureError('');
      await refreshUser?.();
      setSuccess('Profile updated successfully!');
      clearFeedbackLater();
    } catch (error) {
      console.error('Error updating profile:', error);
      const data = error?.response?.data || {};
      const profilePictureApiError = Array.isArray(data.profile_picture)
        ? data.profile_picture[0]
        : data.profile_picture;

      if (profilePictureApiError) {
        setProfilePictureError(String(profilePictureApiError));
      }

      const genericError = data?.error || data?.detail || (!profilePictureApiError ? 'Failed to update profile.' : '');
      setError(genericError);
    } finally {
      setSavingAction('');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match.');
      return;
    }
    setSavingAction('password');
    setSuccess('');
    setError('');
    try {
      await usersAPI.changePassword(passwordData);
      setSuccess('Password changed successfully!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      clearFeedbackLater();
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error?.response?.data?.error || 'Failed to change password.');
    } finally {
      setSavingAction('');
    }
  };

  const handleNotificationUpdate = async () => {
    setSavingAction('notifications');
    setSuccess('');
    setError('');
    try {
      await usersAPI.updateCurrentUserSettings(notifications);
      // If push preference turned on, attempt to subscribe; if turned off, remove subscriptions
      try {
        if (notifications.push_notifications) {
          await handlePushToggle(true);
        } else {
          await handlePushToggle(false);
        }
      } catch (e) {
        console.warn('Push subscription step failed:', e);
      }
      setSuccess('Notification preferences saved!');
      clearFeedbackLater();
    } catch (error) {
      console.error('Error updating notifications:', error);
      setError('Failed to save notification preferences.');
    } finally {
      setSavingAction('');
    }
  };

  const urlBase = import.meta.env.VITE_API_BASE_URL || '';
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || null;

  const base64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handlePushToggle = async (enabled) => {
    try {
      if (!enabled) {
        // delete existing subscriptions on server
        const list = await notificationsAPI.listPushSubscriptions();
        if (Array.isArray(list.results || list)) {
          const items = list.results || list;
          for (const s of items) {
            await notificationsAPI.deletePushSubscription(s.subscription_id);
          }
        }
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setError('Push is not supported in this browser.');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission was not granted.');
        return;
      }

      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey ? base64ToUint8Array(vapidPublicKey) : undefined,
      };

      const subscription = await reg.pushManager.subscribe(subscribeOptions);

      // send subscription to server
      await notificationsAPI.createPushSubscription({ endpoint: subscription.endpoint, p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))) : '', auth: subscription.getKey('auth') ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))) : '' });
    } catch (e) {
      console.error('Push subscription failed', e);
      setError('Failed to register push subscription.');
    }
  };

  const handlePrivacyUpdate = async () => {
    setSavingAction('privacy');
    setSuccess('');
    setError('');
    try {
      await usersAPI.updateCurrentUserSettings(privacy);
      setSuccess('Privacy settings saved!');
      clearFeedbackLater();
    } catch (error) {
      console.error('Error updating privacy:', error);
      setError('Failed to save privacy settings.');
    } finally {
      setSavingAction('');
    }
  };

  const getDepartmentLabel = (departmentId) => {
    if (!departmentId) return 'No department selected';
    const match = departments.find((department) => String(department.department_id) === String(departmentId));
    return match ? `${match.department_name} • ${match.faculty}` : 'Selected department';
  };

  const tabs = [
    { id: 'profile',       label: 'Profile',       icon: '👤' },
    { id: 'password',      label: 'Password',       icon: '🔒' },
    { id: 'notifications', label: 'Notifications',  icon: '🔔' },
    { id: 'privacy',       label: 'Privacy',        icon: '🛡️' },
  ];

  const profileInitials = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .map((name) => name[0]?.toUpperCase())
    .join('') || 'U';

  const profilePictureSrc = profilePicturePreview || profile.profile_picture_url;
  const isWorkplaceSupervisor = profile.affiliation_type === 'organization';
  const institutionOrOrganizationLabel = profile.affiliation_type === 'organization' ? 'Organization' : 'Institution';

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account preferences and security</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message">{success}</div>
      )}

      {loading ? (
        <div className="settings-loading">Loading settings…</div>
      ) : (
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

              <div className="profile-picture-section">
                <div className="profile-picture-preview">
                  {profilePictureSrc ? (
                    <img src={profilePictureSrc} alt="Profile" className="profile-picture-image" />
                  ) : (
                    <span className="profile-picture-fallback">{profileInitials}</span>
                  )}
                </div>

                <div className="profile-picture-actions">
                  <label className="btn-save btn-upload" htmlFor="profile-picture-input">
                    Choose Picture
                  </label>
                  <input
                    id="profile-picture-input"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="profile-picture-input"
                  />
                  {profilePictureSrc && (
                    <button
                      type="button"
                      className="btn-remove-picture"
                      onClick={handleRemoveProfilePicture}
                    >
                      Remove picture
                    </button>
                  )}
                  <small className="field-hint">Accepted: JPG, PNG, WEBP, GIF (max 5MB)</small>
                  {profilePictureError && <small className="field-error">{profilePictureError}</small>}
                </div>
              </div>

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
                  value={profile.phone_number}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  placeholder="+256 700 000 000"
                />
              </div>

              <div className="form-group">
                <label>{institutionOrOrganizationLabel}</label>
                {isWorkplaceSupervisor ? (
                  <input
                    type="text"
                    value={profile.affiliation_name || 'Not set'}
                    readOnly
                    disabled
                    placeholder="Organization is set during registration"
                  />
                ) : (
                  <input
                    type="text"
                    value={profile.institution_name}
                    onChange={(e) => setProfile({ ...profile, institution_name: e.target.value })}
                    placeholder="Enter your institution"
                  />
                )}
                <small className="field-hint">
                  {isWorkplaceSupervisor
                    ? 'Organization is captured from workplace supervisor registration.'
                    : 'Institution is used for student and academic supervisor profiles.'}
                </small>
              </div>

              <div className="form-group">
                <label>Department</label>
                <select
                  value={profile.department_id}
                  onChange={(e) => setProfile({ ...profile, department_id: e.target.value })}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.department_id} value={department.department_id}>
                      {department.department_name} • {department.faculty}
                    </option>
                  ))}
                </select>
                <small className="field-hint">{getDepartmentLabel(profile.department_id)}</small>
              </div>

              <button type="submit" className="btn-save" disabled={savingAction === 'profile'}>
                {savingAction === 'profile' ? 'Saving…' : 'Save Changes'}
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

              <button type="submit" className="btn-save" disabled={savingAction === 'password'}>
                {savingAction === 'password' ? 'Updating…' : 'Update Password'}
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

              <button onClick={handleNotificationUpdate} className="btn-save" disabled={savingAction === 'notifications'}>
                {savingAction === 'notifications' ? 'Saving…' : 'Save Preferences'}
              </button>
              <button
                type="button"
                className="btn-save btn-test"
                onClick={async () => {
                  try {
                    await notificationsAPI.sendTestNotification({ title: 'ILES Test', body: 'This is a test notification from Settings' });
                    setSuccess('Test notification triggered');
                    clearFeedbackLater();
                  } catch (e) {
                    console.error('Failed to send test notification', e);
                    setError('Failed to trigger test notification');
                  }
                }}
              >
                Send test notification
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

              <button onClick={handlePrivacyUpdate} className="btn-save" disabled={savingAction === 'privacy'}>
                {savingAction === 'privacy' ? 'Saving…' : 'Save Privacy Settings'}
              </button>
            </div>
          )}

        </div>
      </div>
      )}
    </div>
  );
};

export default SettingsPage;