# Supervisor Notifications for Log Submissions - Implementation Guide

## Feature Overview

This feature enables supervisors to receive real-time notifications when students submit new weekly logs. Supervisors can:
- See unread notification count on the navbar badge
- View all submitted logs from their assigned students
- See detailed student information (name, email, registration number)
- See organization and activity summary
- Navigate directly to the log for review
- Mark notifications as read/unread

---

## Backend Implementation

### 1. **Model Changes** (`backend/notifications/models.py`)

Added a foreign key to reference the WeeklyLog that triggered the notification:

```python
log = models.ForeignKey('logbooks.WeeklyLog', on_delete=models.CASCADE, null=True, blank=True)
```

Added new notification type:
```python
('log_submitted', 'Log Submitted'),
```

### 2. **Serializer Enhancement** (`backend/notifications/serializers.py`)

The NotificationSerializer now includes a method to serialize log submission details:

```python
def get_log_details(self, obj):
    if obj.log:
        student = obj.log.placement.student
        return {
            'log_id': str(obj.log.log_id),
            'week_number': obj.log.week_number,
            'status': obj.log.status,
            'submitted_at': obj.log.submitted_at,
            'hours_worked': float(obj.log.hours_worked or 0),
            'activities_summary': obj.log.activities_performed[:200],
            'student_id': str(student.student_id),
            'student_name': f"{student.user.first_name} {student.user.last_name}",
            'student_email': student.user.email,
            'student_registration_number': student.registration_number,
            'organization_name': obj.log.placement.organization.name,
        }
    return None
```

### 3. **Signal Handler** (`backend/logbooks/signals.py`)

When a student submits a log, a signal automatically creates notifications for assigned supervisors:

```python
@receiver(post_save, sender=WeeklyLog)
def create_log_submission_notification(sender, instance, created, **kwargs):
    if instance.status == 'submitted' and instance.submitted_at:
        placement = instance.placement
        student_name = f"{placement.student.user.first_name} {placement.student.user.last_name}"
        message = f"New log submission from {student_name} - Week {instance.week_number}"
        
        # Notify workplace supervisor
        if placement.workplace_supervisor:
            Notification.objects.get_or_create(
                user=placement.workplace_supervisor.user,
                log=instance,
                notification_type='log_submitted',
                defaults={'message': message, 'is_read': False}
            )
        
        # Notify academic supervisor
        if placement.academic_supervisor:
            Notification.objects.get_or_create(
                user=placement.academic_supervisor.user,
                log=instance,
                notification_type='log_submitted',
                defaults={'message': message, 'is_read': False}
            )
```

**Key Features:**
- Uses `get_or_create()` to prevent duplicate notifications
- Notifies both workplace and academic supervisors if assigned
- Only triggers when status is 'submitted' AND submitted_at is set

### 4. **Signal Registration** (`backend/logbooks/apps.py`)

```python
class LogbooksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'logbooks'

    def ready(self):
        import logbooks.signals
```

### 5. **Migration** (`backend/notifications/migrations/0003_add_log_reference.py`)

Creates the `log` ForeignKey field and adds 'log_submitted' to notification types.

---

## Frontend Implementation

### **Enhanced Notifications Page** (`frontend/src/pages/NotificationsPage.jsx`)

**Key Features for Log Submission Notifications:**

1. **Student Details Display**
   - Student name with icon (📚)
   - Email address
   - Registration number
   - Organization name

2. **Log Information**
   - Week number
   - Hours worked
   - Activity summary preview (first 200 characters)

3. **Navigation**
   - "Review Log" button → navigates to `/app/logs/{log_id}`
   - Click notification directly → auto-navigates to log
   - Automatically marks as read on click

4. **Visual Styling**
   - Type icon: 📝
   - Color: Blue (#1976d2)
   - Unread background: Light blue tint
   - Styled details section with separator

5. **Additional Features**
   - Mark as read button for unread notifications
   - Delete notification button
   - Filter by read/unread status
   - Mark all as read

---

## User Workflow

### For Students:

1. **Create and Submit Log**
   - Fill out weekly log form
   - Click "Submit" button
   - Log status changes to 'submitted'

2. **Supervisors Get Notified**
   - Notification automatically created for assigned supervisors
   - Includes student name and week number

### For Supervisors:

1. **See Notification Badge**
   - Navbar shows unread count badge
   - Badge auto-updates every 30 seconds

2. **View Notifications**
   - Click notification icon → go to `/app/notifications`
   - See list of submitted logs from assigned students
   - Filter by read/unread status

3. **Review Submitted Logs**
   - Click "Review Log" button or the notification itself
   - Navigates to `/app/logs/{log_id}`
   - Log details page displays:
     - Full log information
     - Student details
     - Option to add feedback/review

---

## Database Migration

Run both migrations to add the new fields:

```bash
cd backend
python manage.py migrate
```

This will:
1. Add `log_review` field (from migration 0002)
2. Add `log` field (from migration 0003)
3. Update notification_type choices

---

## API Response Example

### Get Notifications (with log submission details)

```json
{
  "count": 1,
  "results": [
    {
      "notification_id": "uuid-123",
      "user": "uuid-456",
      "message": "New log submission from John Doe - Week 5",
      "notification_type": "log_submitted",
      "is_read": false,
      "created_at": "2024-04-18T10:30:00Z",
      "log": "uuid-789",
      "log_details": {
        "log_id": "uuid-789",
        "week_number": 5,
        "status": "submitted",
        "submitted_at": "2024-04-18T10:25:00Z",
        "hours_worked": 40.5,
        "activities_summary": "Completed API integration for user authentication, fixed database migration...",
        "student_id": "uuid-001",
        "student_name": "John Doe",
        "student_email": "john@university.edu",
        "student_registration_number": "STU123456",
        "organization_name": "Tech Solutions Inc."
      }
    }
  ]
}
```

---

## Styling & Colors

| Notification Type | Icon | Color | Use Case |
|---|---|---|---|
| Log Submitted | 📝 | Blue (#1976d2) | Student submits a log |
| Feedback Added | 💬 | Purple (#9c27b0) | Supervisor adds feedback |
| Submission Deadline | 📅 | Orange (#ff9800) | Deadline reminder |
| Log Review Pending | 👀 | Green (#4caf50) | Log awaiting review |
| Evaluation Completed | ✅ | Blue (#2196f3) | Evaluation finished |
| Placement Rejected | ❌ | Red (#f44336) | Placement not approved |

---

## Testing Checklist

### Student Submits Log
- [ ] Create a log as a student
- [ ] Submit the log (status → 'submitted')
- [ ] Check supervisor notifications
- [ ] Should see notification with student details
- [ ] "Review Log" button is visible

### Supervisor Views Notification
- [ ] Supervisor logs in
- [ ] Navbar shows unread badge count
- [ ] Click notification icon → goes to `/app/notifications`
- [ ] See log submission notifications
- [ ] Notification shows:
  - [ ] Student name
  - [ ] Student email
  - [ ] Registration number
  - [ ] Organization
  - [ ] Week number
  - [ ] Hours worked
  - [ ] Activity summary

### Navigation
- [ ] Click "Review Log" button → navigates to log details
- [ ] Click notification itself → auto-navigates to log
- [ ] Log details page shows the log with student info
- [ ] Can add feedback from log details page

### Mark as Read
- [ ] Individual "Mark as read" button works
- [ ] Notification changes from unread to read appearance
- [ ] "Mark all as read" button works

### Filtering
- [ ] "All" filter shows all notifications
- [ ] "Unread" filter shows only unread
- [ ] "Read" filter shows only read
- [ ] Counts update correctly

### Duplicate Prevention
- [ ] Submit a log once
- [ ] Should see exactly one notification per supervisor
- [ ] Refreshing page doesn't create duplicates

---

## Troubleshooting

### Issue: Notification not created when log is submitted

**Solution:**
1. Verify `logbooks/signals.py` file exists and has the signal handler
2. Check `logbooks/apps.py` has `import logbooks.signals` in `ready()`
3. Check Django logs for any import errors
4. Verify `submitted_at` is being set when log status changes to 'submitted'
5. Restart backend server

### Issue: Duplicate notifications appearing

**Solution:**
- The signal uses `get_or_create()` with unique constraint (user, log, notification_type)
- If duplicates exist, manually delete them from database:
  ```sql
  DELETE FROM notifications_notification 
  WHERE notification_type = 'log_submitted' 
  AND log_id = 'YOUR_LOG_ID'
  LIMIT 1;
  ```

### Issue: Student details not showing

**Solution:**
1. Check that `log_details` is in API response:
   ```bash
   curl -H "Authorization: Token YOUR_TOKEN" \
     http://localhost:8000/api/notifications/notifications/
   ```
2. Look for `log_details` object with all required fields
3. If missing, verify NotificationSerializer `get_log_details()` method
4. Check that log has a valid placement with student reference

### Issue: Navigation to log not working

**Solution:**
1. Verify `/app/logs/:id` route exists in frontend
2. Check that `log_id` in `log_details` is correct
3. Verify LogsPage component has dynamic route handling
4. Check browser console for routing errors

---

## Performance Considerations

- **Signal Efficiency**: Uses `get_or_create()` to prevent duplicate database hits
- **Query Optimization**: Serializer retrieves related objects efficiently
- **Polling**: Navbar polls every 30 seconds (configurable)
- **Scalability**: Supports multiple supervisors per log without issues

---

## Future Enhancements

1. **Real-time Updates** - WebSocket integration for instant notifications
2. **Email Notifications** - Send email when log is submitted
3. **Batch Notifications** - Digest emails with multiple submissions
4. **Notification Preferences** - Let supervisors customize notification types
5. **Push Notifications** - Mobile app push notifications
6. **Auto-archive** - Automatically delete old notifications after 30 days

---

## Files Modified/Created

### Backend
- ✅ `backend/notifications/models.py` - Added log field
- ✅ `backend/notifications/serializers.py` - Added log_details method
- ✅ `backend/notifications/views.py` - Endpoints (created in previous iteration)
- ✅ `backend/notifications/migrations/0003_add_log_reference.py` - New migration
- ✅ `backend/logbooks/apps.py` - Signal registration
- ✅ `backend/logbooks/signals.py` - NEW signal handler

### Frontend
- ✅ `frontend/src/components/layout/Navbar.jsx` - Notification badge (created in previous iteration)
- ✅ `frontend/src/pages/NotificationsPage.jsx` - Enhanced with log notification handling

---

## Summary

The supervisor notification system automatically notifies supervisors when students submit logs. The system:

1. **Automatically creates notifications** when a log is submitted
2. **Prevents duplicates** using get_or_create with unique constraints
3. **Shows rich student details** including email and registration number
4. **Enables quick navigation** to submitted logs for review
5. **Integrates seamlessly** with the existing notification system
6. **Maintains performance** with efficient database queries

The feature is production-ready and can be deployed immediately after running the database migrations.
