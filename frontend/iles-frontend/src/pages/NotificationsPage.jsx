import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiEye, FiXCircle, FiCheck, FiMessageCircle, FiHeart, FiMonitor, FiClock, FiAlertCircle, FiBriefcase, FiFileText, FiBell, FiSearch, FiTrash2, FiStar, FiBook, FiSettings } from 'react-icons/fi';
import { notificationsAPI } from '../services/endpoints';
import { useAuth } from '../hooks/AuthContext';
import './NotificationsPage.css';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteNotificationId, setDeleteNotificationId] = useState(null);
  const filterInitializedRef = useRef(false);
  const navigate = useNavigate();
  const { notificationId } = useParams();
  const { user } = useAuth();

  const normalizedRole = String(user?.role?.role_name || user?.role_name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const isAdmin = normalizedRole === 'admin';

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (isAdmin) {
          await notificationsAPI.syncAdminSystemSnapshot();
        }
        const data = await notificationsAPI.getNotifications();
        setNotifications(data.results || data || []);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [isAdmin]);

  // Initialize filter based on unread count on first load
  useEffect(() => {
    if (!loading && notifications.length > 0 && !filterInitializedRef.current) {
      const unreadCount = notifications.filter((item) => !item.is_read).length;
      setFilter(unreadCount > 0 ? 'unread' : 'all');
      filterInitializedRef.current = true;
    }
  }, [loading, notifications]);

  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Unknown time';
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getTypeColor = (type) => {
    // Use project primary orange, with black/white only elsewhere
    // All notification types use the project's orange palette to stay consistent
    return '#ff7a00';
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'submission_deadline': return <FiCalendar aria-hidden="true" />;
      case 'log_review_pending': return <FiEye aria-hidden="true" />;
      case 'placement_rejected': return <FiXCircle aria-hidden="true" />;
      case 'placement_submitted': return <FiBriefcase aria-hidden="true" />;
      case 'placement_letter_deleted': return <FiTrash2 aria-hidden="true" />;
      case 'evaluation_completed': return <FiCheck aria-hidden="true" />;
      case 'feedback_added': return <FiMessageCircle aria-hidden="true" />;
      case 'log_submitted': return <FiFileText aria-hidden="true" />;
      case 'system_health_update': return <FiHeart aria-hidden="true" />;
      case 'server_status_update': return <FiMonitor aria-hidden="true" />;
      case 'pending_updates': return <FiClock aria-hidden="true" />;
      case 'system_alert': return <FiAlertCircle aria-hidden="true" />;
      case 'new_company_added': return <FiBriefcase aria-hidden="true" />;
      case 'login_alert': return <FiMonitor aria-hidden="true" />;
      default: return <FiBell aria-hidden="true" />;
    }
  };

  const isAdminSystemType = (type) => {
    return [
      'system_health_update',
      'server_status_update',
      'pending_updates',
      'system_alert',
      'new_company_added',
    ].includes(type);
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((current) => current.map((notif) =>
        notif.notification_id === id ? { ...notif, is_read: true } : notif
      ));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((item) => !item.is_read);
      await Promise.all(unread.map((item) => notificationsAPI.markAsRead(item.notification_id)));
      setNotifications((current) => current.map((notif) => ({ ...notif, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsAPI.deleteNotification(id);
      setNotifications((current) => current.filter((item) => item.notification_id !== id));
    } catch (error) {
      console.error('Failed to delete notification', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.notification_id);

    if (isAdmin && isAdminSystemType(notification.notification_type)) {
      navigate(`/app/notifications/${notification.notification_id}`);
      return;
    }

    if (notification.notification_type === 'feedback_added' && notification.log_review_details?.log_id) {
      navigate(`/app/logs/${notification.log_review_details.log_id}`);
    } else if (notification.notification_type === 'log_submitted' && notification.log_details?.log_id) {
      navigate(`/app/logs/${notification.log_details.log_id}`);
    } else if ((notification.notification_type === 'placement_submitted' || notification.notification_type === 'placement_letter_deleted') && notification.placement_details?.placement_id) {
      navigate(`/app/placements/${notification.placement_details.placement_id}`);
    }
  };

  const selectedNotification = useMemo(() => {
    if (!notificationId) return null;
    return notifications.find((item) => String(item.notification_id) === String(notificationId)) || null;
  }, [notificationId, notifications]);

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="notifications-page">
      {/* Header Section */}
      <div className="notifications-header">
        <div className="notifications-title-block">
          <button
            type="button"
            className="btn-back-dashboard"
            onClick={() => navigate('/app/dashboard')}
            title="Back to dashboard"
          >
            <FiArrowLeft aria-hidden="true" /> Back to dashboard
          </button>
          <h1 className="notifications-title">Notifications</h1>
          {unreadCount > 0 && (
            <p className="notifications-subtitle">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-mark-all"
            title="Mark all notifications as read"
          >
            <FiCheck aria-hidden="true" /> Mark all as read
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="notifications-loading">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <span>Loading notifications…</span>
        </div>
      )}

      {/* Filter Tabs */}
      {!loading && (
        <div className="notifications-tabs">
          {['all', 'unread', 'read'].map((filterType) => {
            const count =
              filterType === 'all'
                ? notifications.length
                : filterType === 'unread'
                ? unreadCount
                : notifications.filter((n) => n.is_read).length;

            return (
              <button
                key={filterType}
                className={`tab-btn${filter === filterType ? ' active' : ''}`}
                onClick={() => setFilter(filterType)}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Notification Details (Admin) */}
      {selectedNotification && isAdmin && isAdminSystemType(selectedNotification.notification_type) && (
        <div
          className="notification-details-panel"
          style={{ '--type-color': getTypeColor(selectedNotification.notification_type) }}
        >
          <div className="notification-details-header">
            <h3>Notification Details</h3>
            <button
              onClick={() => navigate('/app/notifications')}
              className="btn-close-details"
              title="Close details panel"
            >
              <FiXCircle aria-hidden="true" />
            </button>
          </div>
          <p className="notification-details-message">
            {selectedNotification.message}
          </p>
          <div className="notification-details-timestamp">
            {selectedNotification.created_at
              ? new Date(selectedNotification.created_at).toLocaleString()
              : 'Date unavailable'}
          </div>
          {selectedNotification.admin_details && (
            <div className="notification-details-table">
              {Object.entries(selectedNotification.admin_details).map(
                ([key, value]) => (
                  <div key={key} className="details-row">
                    <span className="details-key">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="details-value">{String(value)}</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Notifications List */}
      {!loading && filteredNotifications.length === 0 ? (
        <div className="notifications-empty">
          <span className="empty-icon"><FiBell size={48} aria-hidden="true" /></span>
          <p className="empty-text">No notifications to show</p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map((notification, index) => (
            <NotificationCard
              key={notification.notification_id}
              notification={notification}
              isSelected={
                notificationId &&
                String(notification.notification_id) === String(notificationId)
              }
              isAdmin={isAdmin}
              getTypeColor={getTypeColor}
              getTypeIcon={getTypeIcon}
              getRelativeTime={getRelativeTime}
              isAdminSystemType={isAdminSystemType}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
              onNavigate={navigate}
              style={{
                '--type-color': getTypeColor(notification.notification_type),
              }}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && filteredNotifications.length > 0 && (
        <div className="notifications-footer">
          <p>Stay updated with log submissions, feedback, and internship progress</p>
        </div>
      )}
    </div>
  );
}

// ── Notification Card Component ────────────────────────────────────────
function NotificationCard({
  notification,
  isSelected,
  isAdmin,
  getTypeColor,
  getTypeIcon,
  getRelativeTime,
  isAdminSystemType,
  onMarkAsRead,
  onDelete,
  onNavigate,
  style,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const cardClass = `notification-card${notification.is_read ? '' : ' unread'}${isSelected ? ' selected' : ''}`;

  const handleCardClick = async () => {
    if (!notification.is_read) {
      await onMarkAsRead(notification.notification_id);
    }

    if (isAdmin && isAdminSystemType(notification.notification_type)) {
      onNavigate(`/app/notifications/${notification.notification_id}`);
      return;
    }

    if (
      notification.notification_type === 'feedback_added' &&
      notification.log_review_details?.log_id
    ) {
      onNavigate(`/app/logs/${notification.log_review_details.log_id}`);
    } else if (
      notification.notification_type === 'log_submitted' &&
      notification.log_details?.log_id
    ) {
      onNavigate(`/app/logs/${notification.log_details.log_id}`);
    } else if (notification.notification_type === 'login_alert') {
      onNavigate(`/app/activity`);
    } else if (
      (notification.notification_type === 'placement_submitted' || notification.notification_type === 'placement_letter_deleted') &&
      notification.placement_details?.placement_id
    ) {
      onNavigate(`/app/placements/${notification.placement_details.placement_id}`);
    }
  };

  const isClickable =
    notification.notification_type === 'feedback_added' ||
    notification.notification_type === 'log_submitted' ||
    notification.notification_type === 'login_alert' ||
    notification.notification_type === 'placement_submitted' ||
    notification.notification_type === 'placement_letter_deleted' ||
    (isAdmin && isAdminSystemType(notification.notification_type));

  return (
    <div
      className={cardClass}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isClickable ? handleCardClick : undefined}
      role={isClickable ? 'button' : 'article'}
      tabIndex={isClickable ? 0 : -1}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && handleCardClick() : undefined}
    >
      <div className="notification-body">
        <div className="notification-icon">
          {getTypeIcon(notification.notification_type)}
        </div>

        <div className="notification-content">
          {/* Card Header */}
          <div className="notification-card-header">
            <div>
              <span className="notification-type-label">
                {notification.notification_type
                  ?.replace(/_/g, ' ')
                  .split(' ')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
              </span>
              {!notification.is_read && (
                <span className="notification-badge-new">New</span>
              )}
            </div>
            <span className="notification-time">
              {getRelativeTime(notification.created_at)}
            </span>
          </div>

          {/* Message */}
          <p className="notification-message">{notification.message}</p>

          {/* Feedback Details */}
          {notification.log_review_details && (
            <FeedbackDetailsBox
              details={notification.log_review_details}
              typeColor={getTypeColor(notification.notification_type)}
            />
          )}

          {/* Log Submission Details */}
          {notification.log_details && (
            <LogSubmissionDetailsBox
              details={notification.log_details}
              typeColor={getTypeColor(notification.notification_type)}
            />
          )}

          {notification.placement_details && (
            <PlacementDetailsBox
              details={notification.placement_details}
              typeColor={getTypeColor(notification.notification_type)}
            />
          )}

          {/* Admin Details */}
          {isAdminSystemType(notification.notification_type) &&
            notification.admin_details && (
              <AdminDetailsBox
                typeColor={getTypeColor(notification.notification_type)}
              />
            )}

          {/* Login Alert Details */}
          {notification.notification_type === 'login_alert' &&
            notification.login_alert_details && (
              <LoginAlertDetailsBox
                details={notification.login_alert_details}
                typeColor={getTypeColor(notification.notification_type)}
              />
            )}

          {/* Action Buttons */}
          <div className="notification-actions">
            {!notification.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification.notification_id);
                    }}
                    className="btn-action btn-mark-read"
                    title="Mark this notification as read"
                  >
                    <FiCheck aria-hidden="true" /> Mark as read
                  </button>
            )}

            {notification.notification_type === 'feedback_added' &&
              notification.log_review_details && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(
                      `/app/logs/${notification.log_review_details.log_id}`
                    );
                  }}
                  className="btn-action btn-primary"
                  style={{
                    '--btn-color': getTypeColor(notification.notification_type),
                  }}
                  title="View feedback on log"
                  >
                  <FiMessageCircle aria-hidden="true" /> View Feedback
                </button>
              )}

            {notification.notification_type === 'log_submitted' &&
              notification.log_details && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(`/app/logs/${notification.log_details.log_id}`);
                  }}
                  className="btn-action btn-primary"
                  style={{
                    '--btn-color': getTypeColor(notification.notification_type),
                  }}
                  title="Review submitted log"
                >
                  <FiFileText aria-hidden="true" /> Review Log
                </button>
              )}

            {isAdmin && isAdminSystemType(notification.notification_type) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(`/app/notifications/${notification.notification_id}`);
                }}
                className="btn-action btn-primary"
                style={{
                  '--btn-color': getTypeColor(notification.notification_type),
                }}
                title="View full notification details"
                >
                <FiSearch aria-hidden="true" /> Details
                </button>
            )}

            {notification.notification_type === 'login_alert' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(`/app/activity`);
                }}
                className="btn-action btn-primary"
                style={{
                  '--btn-color': getTypeColor(notification.notification_type),
                }}
                title="View your login activity"
              >
                <FiMonitor aria-hidden="true" /> View Activity
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.notification_id);
              }}
              className="btn-action btn-delete"
              title="Delete this notification"
            >
              <FiTrash2 aria-hidden="true" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feedback Details Box Component ─────────────────────────────────────
function FeedbackDetailsBox({ details, typeColor }) {
  return (
    <div className="notification-detail-box" style={{ '--type-color': typeColor }}>
      <div className="detail-box-header">
        <span className="detail-box-title"><FiMessageCircle aria-hidden="true" /> Feedback from Supervisor</span>
      </div>
      <div className="detail-box-content">
        <div className="detail-row-inline">
          <span className="detail-label">Week:</span>
          <span className="detail-value">{details.week_number}</span>
        </div>
        <div className="detail-row-inline">
          <span className="detail-label">Supervisor:</span>
          <span className="detail-value">{details.supervisor_name}</span>
        </div>
        <div className="detail-row-inline">
          <span className="detail-label">Status:</span>
          <span
            className="detail-badge"
            style={{ '--badge-color': typeColor }}
          >
            {details.status.charAt(0).toUpperCase() + details.status.slice(1)}
          </span>
        </div>
        {details.rating && (
          <div className="detail-row-inline">
            <span className="detail-label">Rating:</span>
            <span className="detail-value detail-rating">
              {Array.from({ length: Math.round(details.rating || 0) }).map((_, i) => (
                <FiStar key={i} aria-hidden="true" />
              ))} ({details.rating}/5)
            </span>
          </div>
        )}
        <p className="detail-hint">← Click card to view full feedback</p>
      </div>
    </div>
  );
}

// ── Log Submission Details Box Component ───────────────────────────────
function LogSubmissionDetailsBox({ details, typeColor }) {
  return (
    <div className="notification-detail-box" style={{ '--type-color': typeColor }}>
      <div className="detail-box-header">
        <span className="detail-box-title"><FiBook aria-hidden="true" /> Log Submission</span>
      </div>
      <div className="detail-box-content">
        <div className="detail-student-info">
          <p className="detail-student-name">{details.student_name}</p>
          <p className="detail-student-email">{details.student_email}</p>
          {details.student_registration_number && (
            <p className="detail-student-reg">
              Reg: {details.student_registration_number}
            </p>
          )}
        </div>
        <div className="detail-log-info">
          <div className="detail-row-inline">
            <span className="detail-label">Week:</span>
            <span className="detail-value">{details.week_number}</span>
          </div>
          <div className="detail-row-inline">
            <span className="detail-label">Hours:</span>
            <span className="detail-value">{details.hours_worked} hrs</span>
          </div>
          {details.organization_name && (
            <div className="detail-row-inline">
              <span className="detail-label">Organization:</span>
              <span className="detail-value">{details.organization_name}</span>
            </div>
          )}
          {details.activities_summary && (
            <p className="detail-activities">
              "{details.activities_summary}…"
            </p>
          )}
        </div>
        <p className="detail-hint">← Click card to review the full log</p>
      </div>
    </div>
  );
}

// ── Admin Details Box Component ────────────────────────────────────────
function AdminDetailsBox({ typeColor }) {
  return (
    <div
      className="notification-detail-box notification-detail-box--admin"
      style={{ '--type-color': typeColor }}
    >
      <div className="detail-box-header">
        <span className="detail-box-title"><FiSettings aria-hidden="true" /> System Information</span>
      </div>
      <p className="detail-hint">← Click card to view full system details</p>
    </div>
  );
}

// ── Login Alert Details Box Component ──────────────────────────────────
function LoginAlertDetailsBox({ details, typeColor }) {
  return (
    <div className="notification-detail-box" style={{ '--type-color': typeColor }}>
      <div className="detail-box-header">
        <span className="detail-box-title"><FiMonitor aria-hidden="true" /> Login Details</span>
      </div>
      <div className="detail-box-content">
        {details.device_name && (
          <div className="detail-row-inline">
            <span className="detail-label">Device:</span>
            <span className="detail-value">{details.device_name}</span>
          </div>
        )}
        {details.browser && (
          <div className="detail-row-inline">
            <span className="detail-label">Browser:</span>
            <span className="detail-value">{details.browser}</span>
          </div>
        )}
        {details.operating_system && (
          <div className="detail-row-inline">
            <span className="detail-label">OS:</span>
            <span className="detail-value">{details.operating_system}</span>
          </div>
        )}
        {details.location && (
          <div className="detail-row-inline">
            <span className="detail-label">Location:</span>
            <span className="detail-value">
              {details.location}
              {details.country && ` (${details.country})`}
            </span>
          </div>
        )}
        {details.ip_address && (
          <div className="detail-row-inline">
            <span className="detail-label">IP Address:</span>
            <span className="detail-value">{details.ip_address}</span>
          </div>
        )}
        <p className="detail-hint">← Click card to view complete login activity history</p>
      </div>
    </div>
  );
}

function PlacementDetailsBox({ details, typeColor }) {
  const rows = [
    ['Placement', details.position_title],
    ['Organisation', details.organization_name],
    ['Supervisor Email', details.workplace_supervisor_email],
    ['Status', details.status],
    ['Submitted', details.submitted_at ? new Date(details.submitted_at).toLocaleString() : 'Unknown'],
  ];

  return (
    <div className="notification-detail-box" style={{ '--type-color': typeColor }}>
      <div className="detail-box-header">
        <span className="detail-box-title"><FiBriefcase aria-hidden="true" /> Placement Details</span>
      </div>
      <div className="detail-box-content">
        {rows.map(([label, value]) => (
          <div key={label} className="detail-row-inline">
            <span className="detail-label">{label}:</span>
            <span className="detail-value">{String(value || '—')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPage;