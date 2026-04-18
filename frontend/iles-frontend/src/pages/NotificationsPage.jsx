import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../services/endpoints';
import './NotificationsPage.css';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await notificationsAPI.getNotifications();
        setNotifications(data.results || data || []);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

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
      default: return '🔔';
    }
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
    // Mark as read
    await markAsRead(notification.notification_id);

    // If it's a feedback notification, navigate to the log
    if (notification.notification_type === 'feedback_added' && notification.log_review_details?.log_id) {
      navigate(`/app/logs/${notification.log_review_details.log_id}`);
    }
    // If it's a log submission notification, navigate to the log
    else if (notification.notification_type === 'log_submitted' && notification.log_details?.log_id) {
      navigate(`/app/logs/${notification.log_details.log_id}`);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
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
                cursor: (notification.notification_type === 'feedback_added' || notification.notification_type === 'log_submitted') ? 'pointer' : 'default',
                position: 'relative',
                opacity: notification.is_read ? 0.85 : 1,
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
                  
                  {/* Show feedback details if available */}
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

                  {/* Show log submission details if available */}
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

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.notification_id);
                        }}
                        style={{ padding: '0.25rem 0.75rem', backgroundColor: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Mark as read
                      </button>
                    )}
                    {notification.notification_type === 'feedback_added' && notification.log_review_details && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/logs/${notification.log_review_details.log_id}`);
                        }}
                        style={{ padding: '0.25rem 0.75rem', backgroundColor: '#9c27b0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        View Feedback
                      </button>
                    )}
                    {notification.notification_type === 'log_submitted' && notification.log_details && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/logs/${notification.log_details.log_id}`);
                        }}
                        style={{ padding: '0.25rem 0.75rem', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Review Log
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.notification_id);
                      }}
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