import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { notificationsAPI } from '../services/endpoints';
import { useAuth } from '../hooks/AuthContext';
import './NotificationsPage.css';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
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
    switch(type) {
      case 'submission_deadline': return '#ff9800';
      case 'log_review_pending': return '#4caf50';
      case 'placement_rejected': return '#f44336';
      case 'evaluation_completed': return '#2196f3';
      case 'feedback_added': return '#9c27b0';
      case 'log_submitted': return '#1976d2';
      case 'system_health_update': return '#0ea5e9';
      case 'server_status_update': return '#16a34a';
      case 'pending_updates': return '#f59e0b';
      case 'system_alert': return '#dc2626';
      case 'new_company_added': return '#4f46e5';
      default: return '#666';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'submission_deadline': return '📅';
      case 'log_review_pending': return '👀';
      case 'placement_rejected': return '❌';
      case 'evaluation_completed': return '✅';
      case 'feedback_added': return '💬';
      case 'log_submitted': return '📝';
      case 'system_health_update': return '❤️';
      case 'server_status_update': return '🖥️';
      case 'pending_updates': return '⏳';
      case 'system_alert': return '🚨';
      case 'new_company_added': return '🏢';
      default: return '🔔';
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
    <div style={{ padding: '2rem', maxWidth: '980px', margin: '0 auto' }}>

      {/* ── Back Button ── */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          background: 'transparent',
          border: '1.5px solid #e4ddd5',
          borderRadius: '999px',
          padding: '0.4rem 1rem 0.4rem 0.5rem',
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontWeight: '500',
          color: '#6b5f55',
          transition: 'all 220ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#f5f2ee';
          e.currentTarget.style.borderColor = '#c9bfb3';
          e.currentTarget.style.color = '#1c1916';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = '#e4ddd5';
          e.currentTarget.style.color = '#6b5f55';
        }}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#1c1916',
          color: '#fff',
          flexShrink: 0,
        }}>
          <FiArrowLeft size={13} />
        </span>
        Back
      </button>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Notifications</h2>
          {unreadCount > 0 && (
            <p style={{ margin: '0.5rem 0 0', color: '#666' }}>
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading && <p style={{ marginBottom: '1rem', color: '#666' }}>Loading notifications...</p>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #e0e0e0' }}>
        <button onClick={() => setFilter('all')} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: filter === 'all' ? '#1a73e8' : '#666', borderBottom: filter === 'all' ? '2px solid #1a73e8' : 'none', fontWeight: filter === 'all' ? 'bold' : 'normal' }}>
          All ({notifications.length})
        </button>
        <button onClick={() => setFilter('unread')} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: filter === 'unread' ? '#1a73e8' : '#666', borderBottom: filter === 'unread' ? '2px solid #1a73e8' : 'none', fontWeight: filter === 'unread' ? 'bold' : 'normal' }}>
          Unread ({unreadCount})
        </button>
        <button onClick={() => setFilter('read')} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: filter === 'read' ? '#1a73e8' : '#666', borderBottom: filter === 'read' ? '2px solid #1a73e8' : 'none', fontWeight: filter === 'read' ? 'bold' : 'normal' }}>
          Read ({notifications.filter((item) => item.is_read).length})
        </button>
      </div>

      {selectedNotification && isAdmin && isAdminSystemType(selectedNotification.notification_type) && (
        <div style={{ marginBottom: '1.25rem', padding: '1rem', border: `2px solid ${getTypeColor(selectedNotification.notification_type)}`, borderRadius: '8px', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h3 style={{ margin: 0, color: '#1f2937' }}>Notification Details</h3>
            <button
              onClick={() => navigate('/app/notifications')}
              style={{ padding: '0.3rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
          <p style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>{selectedNotification.message}</p>
          <div style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
            {selectedNotification.created_at ? new Date(selectedNotification.created_at).toLocaleString() : 'Date unavailable'}
          </div>
          {selectedNotification.admin_details && (
            <div style={{ marginTop: '0.8rem', padding: '0.75rem', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
              {Object.entries(selectedNotification.admin_details).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px dashed #e5e7eb', padding: '0.25rem 0' }}>
                  <span style={{ fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                  <span style={{ color: '#111827' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {filteredNotifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#666' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
          <p>No notifications to show</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredNotifications.map((notification) => (
            <div
              key={notification.notification_id}
              style={{
                padding: '1rem',
                backgroundColor: notification.is_read ? '#fff' : '#f0f7ff',
                border: `2px solid ${notification.is_read ? '#e0e0e0' : getTypeColor(notification.notification_type)}`,
                borderRadius: '8px',
                transition: 'all 0.2s',
                cursor: (
                  notification.notification_type === 'feedback_added'
                  || notification.notification_type === 'log_submitted'
                  || (isAdmin && isAdminSystemType(notification.notification_type))
                ) ? 'pointer' : 'default',
                position: 'relative',
                opacity: notification.is_read ? 0.85 : 1,
                boxShadow: notificationId && String(notification.notification_id) === String(notificationId)
                  ? `0 0 0 2px ${getTypeColor(notification.notification_type)}33`
                  : 'none',
              }}
              onClick={() => handleNotificationClick(notification)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ fontSize: '2rem' }}>
                  {getTypeIcon(notification.notification_type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>
                      {notification.notification_type?.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      {!notification.is_read && (
                        <span style={{ marginLeft: '0.5rem', padding: '0.125rem 0.375rem', backgroundColor: '#1a73e8', color: 'white', fontSize: '0.75rem', borderRadius: '12px' }}>
                          New
                        </span>
                      )}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#999' }}>{getRelativeTime(notification.created_at)}</span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#666', lineHeight: '1.4' }}>{notification.message}</p>

                  {notification.log_review_details && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.03)', borderLeft: `3px solid ${getTypeColor(notification.notification_type)}`, borderRadius: '4px' }}>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#555', fontWeight: '500' }}>
                        Week {notification.log_review_details.week_number} Feedback from {notification.log_review_details.supervisor_name}
                      </p>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#666' }}>
                        Status: <span style={{ fontWeight: 'bold', color: getTypeColor(notification.log_review_details.status) }}>
                          {notification.log_review_details.status.charAt(0).toUpperCase() + notification.log_review_details.status.slice(1)}
                        </span>
                      </p>
                      {notification.log_review_details.rating && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#666' }}>
                          Rating: {'⭐'.repeat(Math.round(notification.log_review_details.rating))} ({notification.log_review_details.rating}/5)
                        </p>
                      )}
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#555', fontStyle: 'italic' }}>
                        Click to view feedback →
                      </p>
                    </div>
                  )}

                  {notification.log_details && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(25, 118, 210, 0.04)', borderLeft: `3px solid ${getTypeColor(notification.notification_type)}`, borderRadius: '4px' }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#555', fontWeight: '600' }}>
                          📚 {notification.log_details.student_name}
                        </p>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#777' }}>
                          {notification.log_details.student_email}
                        </p>
                        {notification.log_details.student_registration_number && (
                          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#777' }}>
                            Reg: {notification.log_details.student_registration_number}
                          </p>
                        )}
                      </div>
                      <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #ddd' }} />
                      <div>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#555', fontWeight: '500' }}>
                          Week {notification.log_details.week_number} - {notification.log_details.hours_worked} hours
                        </p>
                        {notification.log_details.organization_name && (
                          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', color: '#777' }}>
                            @ {notification.log_details.organization_name}
                          </p>
                        )}
                        {notification.log_details.activities_summary && (
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                            "{notification.log_details.activities_summary}..."
                          </p>
                        )}
                      </div>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#555', fontStyle: 'italic' }}>
                        Click to review log →
                      </p>
                    </div>
                  )}

                  {isAdminSystemType(notification.notification_type) && notification.admin_details && (
                    <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(2, 6, 23, 0.03)', borderLeft: `3px solid ${getTypeColor(notification.notification_type)}`, borderRadius: '4px' }}>
                      <p style={{ margin: 0, color: '#475569', fontSize: '0.86rem' }}>
                        Tap to open full notification details.
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                    {!notification.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.notification_id); }}
                        style={{ padding: '0.25rem 0.75rem', backgroundColor: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Mark as read
                      </button>
                    )}
                    {notification.notification_type === 'feedback_added' && notification.log_review_details && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/logs/${notification.log_review_details.log_id}`); }}
                        style={{ padding: '0.25rem 0.75rem', backgroundColor: '#9c27b0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        View Feedback
                      </button>
                    )}
                    {notification.notification_type === 'log_submitted' && notification.log_details && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/logs/${notification.log_details.log_id}`); }}
                        style={{ padding: '0.25rem 0.75rem', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Review Log
                      </button>
                    )}
                    {isAdmin && isAdminSystemType(notification.notification_type) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/notifications/${notification.notification_id}`); }}
                        style={{ padding: '0.25rem 0.75rem', backgroundColor: getTypeColor(notification.notification_type), color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        View Details
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.notification_id); }}
                      style={{ padding: '0.25rem 0.75rem', backgroundColor: 'transparent', border: '1px solid #ff4444', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', color: '#ff4444' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', textAlign: 'center', borderTop: '1px solid #e0e0e0', color: '#999', fontSize: '0.875rem' }}>
        <p>Stay updated with log submissions, feedback, and internship progress</p>
      </div>
    </div>
  );
}

export default NotificationsPage;