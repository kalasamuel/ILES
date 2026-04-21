# Supervisor Feedback Notification System - Implementation Guide

## Feature Overview

The notification system enables students to receive real-time updates about feedback from their supervisors on weekly logs. Students can:
- See unread notification count on the navbar badge
- View all notifications with filtering options
- Automatically navigate to specific logs with feedback
- See detailed review information including supervisor name, rating, and status

---

## Backend Implementation

### 1. **Model Changes** (`backend/notifications/models.py`)

Added a foreign key to reference the LogReview that triggered the notification:

```python
log_review = models.ForeignKey('reviews.LogReview', on_delete=models.CASCADE, null=True, blank=True)
```

Added new notification type:
```python
('feedback_added', 'Feedback Added'),
```

### 2. **Serializer Enhancement** (`backend/notifications/serializers.py`)

The NotificationSerializer now includes a method to serialize review details:

```python
def get_log_review_details(self, obj):
    if obj.log_review:
        return {
            'review_id': str(obj.log_review.review_id),
            'log_id': str(obj.log_review.log.log_id),
            'week_number': obj.log_review.log.week_number,
            'comments': obj.log_review.comments,
            'rating': obj.log_review.rating,
            'status': obj.log_review.status,
            'supervisor_name': f"{obj.log_review.supervisor.user.first_name} {obj.log_review.supervisor.user.last_name}",
        }
    return None
```

### 3. **Signal Handler** (`backend/reviews/signals.py`)

When a supervisor creates or updates a log review, a signal automatically creates a notification:

```python
@receiver(post_save, sender=LogReview)
def create_feedback_notification(sender, instance, created, **kwargs):
    if created:
        student_user = instance.log.placement.student.user
        supervisor_name = f"{instance.supervisor.user.first_name} {instance.supervisor.user.last_name}"
        message = f"You have new feedback from {supervisor_name} on Week {instance.log.week_number}'s log"
        
        Notification.objects.create(
            user=student_user,
            message=message,
            notification_type='feedback_added',
            log_review=instance,
        )
```

### 4. **New API Endpoints** (`backend/notifications/views.py`)

#### Get Unread Count
```
GET /notifications/notifications/unread_count/
Response: { "unread_count": 3 }
```

#### Mark All as Read
```
POST /notifications/notifications/mark_all_as_read/
Response: { "marked_as_read": 3 }
```

#### Mark Individual as Read
```
PATCH /notifications/notifications/{id}/
Body: { "is_read": true }
```

---

## Frontend Implementation

### 1. **Navbar Updates** (`frontend/src/components/layout/Navbar.jsx`)

**Key Changes:**
- Polls for new notifications every 30 seconds
- Shows unread count badge (displays '9+' if more than 9)
- Clicking notification icon navigates to `/app/notifications`

```javascript
useEffect(() => {
    const fetchUnreadNotifications = async () => {
        const response = await notificationsAPI.getNotifications();
        const notifications = response.results || response || [];
        setUnreadCount(notifications.filter((item) => !item.is_read).length);
    };
    
    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 30000);
    return () => clearInterval(interval);
}, []);
```

### 2. **Notifications Page Enhancements** (`frontend/src/pages/NotificationsPage.jsx`)

**Key Features:**
- **Type-specific icons and colors** for different notification types
- **Feedback details display** showing:
  - Week number
  - Supervisor name
  - Review status with color coding
  - Star rating display
- **Direct navigation** - Click "View Feedback" button to jump to the log
- **Auto-navigation** - Clicking feedback notification also navigates to log
- **Filter tabs** - All, Unread, Read with counts
- **Mark as read** - Individual or all at once
- **Delete** - Remove notifications

```javascript
const handleNotificationClick = async (notification) => {
    await markAsRead(notification.notification_id);
    
    if (notification.notification_type === 'feedback_added' && 
        notification.log_review_details?.log_id) {
        navigate(`/app/logs/${notification.log_review_details.log_id}`);
    }
};
```

---

## User Workflow

### For Students:

1. **Receive Feedback**
   - Supervisor submits review on their log
   - Notification automatically created

2. **See Notification Badge**
   - Navbar shows unread count badge
   - Badge auto-updates every 30 seconds

3. **View Notifications**
   - Click notification bell icon
   - Navigate to `/app/notifications` page
   - See all notifications with filters

4. **Access Feedback**
   - Click "View Feedback" button or the notification itself
   - Auto-navigated to `/app/logs/{log_id}`
   - See full log details and feedback together

### For Supervisors:

- Normal review creation process unchanged
- System automatically notifies student
- No additional actions needed

---

## Database Migration

Run the migration to add the new field:

```bash
cd backend
python manage.py migrate
```

The migration file (`notifications/migrations/0002_add_logreview_reference.py`) adds:
- `log_review` ForeignKey field to Notification model
- Updated `notification_type` choices to include 'feedback_added'

---

## API Response Examples

### Get Notifications (with feedback details)

```json
{
  "count": 1,
  "results": [
    {
      "notification_id": "uuid-123",
      "user": "uuid-456",
      "message": "You have new feedback from Jane Smith on Week 5's log",
      "notification_type": "feedback_added",
      "is_read": false,
      "created_at": "2024-04-18T10:30:00Z",
      "log_review": "uuid-789",
      "log_review_details": {
        "review_id": "uuid-789",
        "log_id": "uuid-999",
        "week_number": 5,
        "comments": "Great progress this week! Consider improving on...",
        "rating": 4.5,
        "status": "approved",
        "supervisor_name": "Jane Smith"
      }
    }
  ]
}
```

---

## Styling & Colors

| Notification Type | Icon | Color |
|---|---|---|
| Feedback Added | 💬 | Purple (#9c27b0) |
| Submission Deadline | 📅 | Orange (#ff9800) |
| Log Review Pending | 👀 | Green (#4caf50) |
| Placement Rejected | ❌ | Red (#f44336) |
| Evaluation Completed | ✅ | Blue (#2196f3) |

---

## Testing Checklist

1. **Notification Creation**
   - [ ] Create a log review as supervisor
   - [ ] Verify notification appears in student's notifications
   - [ ] Check notification type is 'feedback_added'

2. **Navbar Badge**
   - [ ] Badge shows correct unread count
   - [ ] Badge updates after 30 seconds when new notification arrives
   - [ ] Badge disappears when all notifications marked as read

3. **Notifications Page**
   - [ ] All notifications display correctly
   - [ ] Filters (All/Unread/Read) work
   - [ ] Feedback details show supervisor name, week, status, rating
   - [ ] "View Feedback" button navigates to log

4. **Navigation**
   - [ ] Clicking feedback notification navigates to log details
   - [ ] Log details page shows the review/feedback
   - [ ] Back button returns to notifications

5. **Mark as Read**
   - [ ] Individual "Mark as read" button works
   - [ ] "Mark all as read" button works
   - [ ] UI updates immediately
   - [ ] Changes persist after page reload

6. **Delete**
   - [ ] Delete button removes notification
   - [ ] Notification list updates immediately

---

## Troubleshooting

### Notifications not appearing for feedback
- [ ] Check that signal handler is registered in `reviews/apps.py`
- [ ] Verify `log_review` field exists in database (run migrations)
- [ ] Check server logs for signal errors

### Badge not updating
- [ ] Verify polling interval is set to 30 seconds
- [ ] Check browser console for API errors
- [ ] Ensure `getNotifications()` API is working

### Navigation not working
- [ ] Verify log route exists: `/app/logs/{id}`
- [ ] Check that `log_review_details` is populated in API response
- [ ] Confirm LogsPage component has `/app/logs/:id` route

### Feedback details not showing
- [ ] Verify NotificationSerializer's `get_log_review_details()` method
- [ ] Check that LogReview has all required fields populated
- [ ] Inspect API response in network tab to see actual data

---

## Future Enhancements

- [ ] WebSocket integration for real-time notifications
- [ ] Email notifications option
- [ ] Notification preferences/settings per student
- [ ] Archive old notifications
- [ ] Notification categories/grouping
- [ ] Push notifications for mobile
- [ ] Batch notifications (digest emails)
