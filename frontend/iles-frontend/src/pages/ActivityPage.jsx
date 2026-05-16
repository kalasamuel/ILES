import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiMonitor,
  FiGlobe,
  FiWifi,
  FiClock,
  FiMap,
} from 'react-icons/fi';
import { notificationsAPI } from '../services/endpoints';
import './ActivityPage.css';

function ActivityPage() {
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLoginHistory = async () => {
      try {
        setLoading(true);
        const data = await notificationsAPI.getLoginHistory();
        setLoginHistory(data.results || data || []);
      } catch (err) {
        console.error('Failed to fetch login history', err);
        setError('Failed to load your login activity. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLoginHistory();
  }, []);

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Unknown time';
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}w ago`;
  };

  const getDeviceIcon = (deviceType) => {
    switch ((deviceType || '').toLowerCase()) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📊';
      case 'desktop':
      default:
        return '🖥️';
    }
  };

  return (
    <div className="activity-page">
      {/* Header */}
      <div className="activity-header">
        <button
          onClick={() => navigate('/app/settings')}
          className="btn-back"
          title="Back to Settings"
        >
          <FiArrowLeft aria-hidden="true" /> Back
        </button>
        <div className="activity-title-block">
          <h1 className="activity-title">Login Activity</h1>
          <p className="activity-subtitle">
            View all login attempts and device information
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="activity-loading">
          <div className="loading-spinner"></div>
          <p>Loading your login history…</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="activity-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && loginHistory.length === 0 && (
        <div className="activity-empty">
          <p>No login activity found.</p>
        </div>
      )}

      {/* Login History List */}
      {!loading && !error && loginHistory.length > 0 && (
        <div className="activity-list">
          <div className="activity-stats">
            <p>
              Total logins: <strong>{loginHistory.length}</strong>
            </p>
          </div>

          {loginHistory.map((login, index) => (
            <div key={login.login_id || index} className="activity-item">
              <div className="activity-item-header">
                <div className="device-badge">
                  {getDeviceIcon(login.device_type)}
                  <span className="device-info">
                    <span className="device-name">{login.device_name}</span>
                    <span className="browser-name">{login.browser || 'Unknown Browser'}</span>
                  </span>
                </div>
                <div className="activity-time">
                  <span className="time-relative">{formatRelativeTime(login.logged_in_at)}</span>
                  <span className="time-absolute">{formatDateTime(login.logged_in_at)}</span>
                </div>
              </div>

              <div className="activity-details">
                <div className="detail-row">
                  <span className="detail-icon">
                    <FiMonitor aria-hidden="true" />
                  </span>
                  <span className="detail-label">OS:</span>
                  <span className="detail-value">
                    {login.operating_system || 'Unknown'}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-icon">
                    <FiGlobe aria-hidden="true" />
                  </span>
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">
                    {login.location || login.city || 'Unknown'}
                    {login.country && ` (${login.country})`}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-icon">
                    <FiWifi aria-hidden="true" />
                  </span>
                  <span className="detail-label">IP Address:</span>
                  <span className="detail-value">{login.ip_address || 'Unknown'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      {!loading && !error && loginHistory.length > 0 && (
        <div className="activity-footer">
          <p>
            <strong>Security Tip:</strong> Don't recognize a login above? Change your password
            immediately and review your account security.
          </p>
        </div>
      )}
    </div>
  );
}

export default ActivityPage;
