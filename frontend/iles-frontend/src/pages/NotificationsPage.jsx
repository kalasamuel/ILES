import React, { useState } from 'react';

function NotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Weekly Log Reminder',
      message: 'Don\'t forget to submit your weekly activity log by Friday',
      time: '2 hours ago',
      type: 'reminder',
      read: false,
      icon: '📝'
    },
    {
      id: 2,
      title: 'Review Completed',
      message: 'Your supervisor has reviewed your Week 4 log',
      time: 'Yesterday',
      type: 'success',
      read: false,
      icon: '✅'
    },
    {
      id: 3,
      title: 'Evaluation Score Available',
      message: 'Your mid-term evaluation score is now available',
      time: '2 days ago',
      type: 'info',
      read: true,
      icon: '📊'
    },
    {
      id: 4,
      title: 'Upcoming Deadline',
      message: 'Final project submission deadline in 2 weeks',
      time: '3 days ago',
      type: 'warning',
      read: true,
      icon: '⚠️'
    }
  ]);

  const [filter, setFilter] = useState('all'); // all, unread, read

  const markAsRead = (id) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'reminder': return '#ff9800';
      case 'success': return '#4caf50';
      case 'warning': return '#f44336';
      case 'info': return '#2196f3';
      default: return '#666';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
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
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1a73e8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '1.5rem',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: filter === 'all' ? '#1a73e8' : '#666',
            borderBottom: filter === 'all' ? '2px solid #1a73e8' : 'none',
            fontWeight: filter === 'all' ? 'bold' : 'normal'
          }}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: filter === 'unread' ? '#1a73e8' : '#666',
            borderBottom: filter === 'unread' ? '2px solid #1a73e8' : 'none',
            fontWeight: filter === 'unread' ? 'bold' : 'normal'
          }}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: filter === 'read' ? '#1a73e8' : '#666',
            borderBottom: filter === 'read' ? '2px solid #1a73e8' : 'none',
            fontWeight: filter === 'read' ? 'bold' : 'normal'
          }}
        >
          Read ({notifications.filter(n => n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          color: '#666'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
          <p>No notifications to show</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredNotifications.map(notification => (
            <div
              key={notification.id}
              style={{
                padding: '1rem',
                backgroundColor: notification.read ? '#fff' : '#f0f7ff',
                border: `2px solid ${notification.read ? '#e0e0e0' : getTypeColor(notification.type)}`,
                borderRadius: '8px',
                transition: 'all 0.2s',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => markAsRead(notification.id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ fontSize: '2rem' }}>{notification.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>
                      {notification.title}
                      {!notification.read && (
                        <span style={{
                          marginLeft: '0.5rem',
                          padding: '0.125rem 0.375rem',
                          backgroundColor: '#1a73e8',
                          color: 'white',
                          fontSize: '0.75rem',
                          borderRadius: '12px'
                        }}>
                          New
                        </span>
                      )}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#999' }}>
                      {notification.time}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#666', lineHeight: '1.4' }}>
                    {notification.message}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'transparent',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      {notification.read ? 'Mark unread' : 'Mark as read'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'transparent',
                        border: '1px solid #ff4444',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: '#ff4444'
                      }}
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

      {/* Footer */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0',
        color: '#999',
        fontSize: '0.875rem'
      }}>
        <p>Stay updated with your internship progress and deadlines</p>
      </div>
    </div>
  );
}

export default NotificationsPage;