# Complete Notifications Implementation - Quick Reference

## What's Implemented

### 1. ✅ Student Feedback Notifications
**When**: Supervisor adds feedback on a log
**Who Receives**: The student who submitted the log
**Details Shown**: Supervisor name, week #, rating, status, feedback preview
**Action**: Click → navigate to log with feedback

### 2. ✅ Supervisor Log Submission Notifications  
**When**: Student submits a log
**Who Receives**: Workplace and academic supervisors assigned to the placement
**Details Shown**: Student name, email, reg#, organization, hours, activity summary
**Action**: Click → navigate to log for review

---

## File Structure

```
backend/
├── notifications/
│   ├── models.py ✅ (added log_review & log fields)
│   ├── serializers.py ✅ (added log_review_details & log_details)
│   ├── views.py ✅ (unread_count, mark_all_as_read endpoints)
│   └── migrations/
│       ├── 0002_add_logreview_reference.py ✅
│       └── 0003_add_log_reference.py ✅
├── reviews/
│   ├── apps.py ✅ (signals registration)
│   └── signals.py ✅ (feedback notification signal)
└── logbooks/
    ├── apps.py ✅ (signals registration)
    └── signals.py ✅ (log submission signal)

frontend/
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── Navbar.jsx ✅ (notification badge + polling)
│   └── pages/
│       └── NotificationsPage.jsx ✅ (both notification types)
```

---

## Backend Setup

### Step 1: Run Migrations
```bash
cd backend
python manage.py migrate
```

This will:
- Add `log_review` field to Notification model
- Add `log` field to Notification model
- Update notification_type choices

### Step 2: Restart Server
```bash
python manage.py runserver
```

The signal handlers will auto-load from `ready()` methods in:
- `reviews/apps.py`
- `logbooks/apps.py`

### Step 3: Verify Setup
Check that no migration errors appear and server starts cleanly.

---

## Frontend Setup

No additional setup needed! The changes are already in place:

1. **Navbar.jsx** - Automatically polls for notifications
2. **NotificationsPage.jsx** - Handles both feedback and submission notifications

The frontend will work once backend migrations are complete.

---

## Deployment Checklist

### Backend
- [ ] Run `python manage.py migrate`
- [ ] Restart Django server
- [ ] Verify no import errors in logs

### Frontend
- [ ] No deployment needed (already updated)
- [ ] Verify Navbar notification badge appears
- [ ] Test notification navigation

### Database
- [ ] Backup database before migration
- [ ] Verify migration completed successfully
- [ ] Check notification tables have new fields

---

## How to Test

### Test Scenario 1: Student Receives Feedback
```
1. Login as Supervisor
2. Go to Reviews page
3. Submit review on a student's log
4. Login as Student
5. Check navbar - should see badge "1"
6. Click badge → NotificationsPage
7. See feedback notification with supervisor details
8. Click notification → navigate to log with feedback
```

### Test Scenario 2: Supervisor Receives Log Submission
```
1. Login as Student
2. Go to LogsPage
3. Create new log
4. Submit log (status → 'submitted')
5. Login as Supervisor
6. Check navbar - should see badge "1"
7. Click badge → NotificationsPage
8. See submission notification with student details
9. Click "Review Log" → navigate to log for review
```

### Test Scenario 3: Bulk Operations
```
1. Create multiple notifications
2. Click "Mark all as read"
3. All notifications marked as read
4. Badge disappears from navbar
5. Filter tabs show updated counts
```

---

## API Endpoints Available

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications/notifications/` | GET | List user's notifications |
| `/notifications/notifications/{id}/` | PATCH | Update notification (mark as read) |
| `/notifications/notifications/{id}/` | DELETE | Delete notification |
| `/notifications/notifications/unread_count/` | GET | Get unread count |
| `/notifications/notifications/mark_all_as_read/` | POST | Mark all as read |

---

## Notification Types Supported

| Type | Icon | Color | Trigger |
|------|------|-------|---------|
| log_submitted | 📝 | Blue | Student submits log |
| feedback_added | 💬 | Purple | Supervisor adds feedback |
| log_review_pending | 👀 | Green | Automatic (future) |
| submission_deadline | 📅 | Orange | Deadline reminder |
| evaluation_completed | ✅ | Blue | Evaluation done |
| placement_approved | ✓ | Green | Placement approved |
| placement_rejected | ❌ | Red | Placement rejected |

---

## Troubleshooting

### Notifications Not Appearing
1. Check migrations ran: `python manage.py showmigrations`
2. Check signals are registered in apps.py `ready()` method
3. Check Django logs for errors
4. Verify notification_type in database matches code

### Badge Not Updating
1. Open browser DevTools → Network tab
2. Should see API calls to `/notifications/notifications/` every 30 seconds
3. Check browser console for JavaScript errors
4. Verify `getNotifications()` API works with Postman/curl

### Duplicate Notifications
1. Uses `get_or_create()` to prevent duplicates
2. If duplicates exist, manually clean up in database
3. Restart server after cleanup

### Student/Supervisor Details Missing
1. Check that all required ForeignKey relationships exist
2. Verify serializer `get_log_details()` and `get_log_review_details()` methods
3. Test API response directly: `curl http://localhost:8000/api/notifications/notifications/`
4. Check that object relationships are properly linked

---

## Performance Tips

### Reduce Polling Interval
Currently set to 30 seconds. To change:
```javascript
// In Navbar.jsx
const interval = setInterval(fetchUnreadNotifications, 10000); // 10 seconds
```

### Optimize Database Queries
The serializer uses `select_related()` implicitly through ForeignKey relationships. For high volume:
```python
# In notifications/views.py
def get_queryset(self):
    return self.queryset.filter(user=self.request.user)\
        .select_related('log_review__log', 'log__placement__student__user')\
        .order_by('-created_at')
```

### Archive Old Notifications
Add a management command to delete notifications older than 30 days:
```bash
python manage.py delete_old_notifications --days 30
```

---

## Next Steps (Optional Enhancements)

1. **WebSocket Integration** - Real-time notifications without polling
2. **Email Notifications** - Send email for important notifications
3. **Mobile Push** - PWA/mobile app push notifications
4. **Notification Preferences** - User control over notification types
5. **Batch Digest** - Daily digest emails
6. **Read Receipts** - Track when supervisors read notifications
7. **Notification Groups** - Group similar notifications together

---

## Support & Debugging

### Check Signal Handler
```python
# Django shell
python manage.py shell
>>> from django.dispatch import receiver
>>> from reviews.signals import create_feedback_notification
>>> from logbooks.signals import create_log_submission_notification
>>> # Signals should be imported without error
```

### Manual Test
```bash
# Create test notification manually
python manage.py shell
>>> from notifications.models import Notification
>>> from accounts.models import User
>>> user = User.objects.first()
>>> Notification.objects.create(
...     user=user,
...     message="Test",
...     notification_type='log_submitted',
... )
```

### View All Migrations
```bash
python manage.py showmigrations notifications
# Should show:
# [X] 0001_initial
# [X] 0002_add_logreview_reference
# [X] 0003_add_log_reference
```

---

## Summary

✅ **Complete Implementation** of two-way notification system:
- Students notified about feedback from supervisors
- Supervisors notified about log submissions from students
- Both with rich details and direct navigation
- Integrated with navbar badge and polling
- Ready for production deployment

**Next Action**: Run migrations and test!
