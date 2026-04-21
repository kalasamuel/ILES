# Quick Start: Supervisor Feedback Notifications

## What Was Implemented

✅ **Automatic Notifications**: When supervisors add feedback to a student's log, a notification is automatically created  
✅ **Unread Badge**: Navbar shows count of unread notifications  
✅ **Smart Navigation**: Click a feedback notification → jumps directly to that log with feedback  
✅ **Rich Details**: See supervisor name, week number, rating, and status right in the notification  
✅ **Notification Management**: Mark as read, mark all as read, or delete notifications  

---

## Deployment Steps

### Step 1: Backend Migration
```bash
cd backend
python manage.py migrate
```

This creates the `log_review` field on the Notification model.

### Step 2: Verify Signal Registration
Check that `reviews/apps.py` has this in the `ready()` method:
```python
def ready(self):
    import reviews.signals
```

### Step 3: Restart Backend Server
```bash
python manage.py runserver
```

### Step 4: Frontend Already Updated
The frontend changes are included in:
- `frontend/src/components/layout/Navbar.jsx` - Notification badge with polling
- `frontend/src/pages/NotificationsPage.jsx` - Enhanced notifications display

No frontend build needed if using Vite dev server (changes auto-reload).

---

## Testing the Feature

### Test Scenario 1: Create Feedback Notification

**As a Supervisor:**
1. Login as supervisor account
2. Go to Reviews page
3. Select a student's log
4. Fill in feedback (comments, rating, status)
5. Submit review

**As a Student:**
1. Login as the student account
2. Check navbar - should see "1" badge on notification icon
3. Click notification icon
4. See new "Feedback Added" notification with supervisor details

### Test Scenario 2: Navigate to Log with Feedback

**From Notifications Page:**
1. Ensure you're on the Notifications page (`/app/notifications`)
2. See feedback notification with details:
   - Week X Feedback from [Supervisor Name]
   - Status: [Approved/Needs Revision/Rejected]
   - Rating: ⭐⭐⭐⭐⭐
3. Click "View Feedback" button
4. Should navigate to `/app/logs/{log_id}`
5. Log details page shows the feedback in "Supervisor Feedback" section

### Test Scenario 3: Mark as Read

**Individual:**
1. From Notifications page, click "Mark as read" on unread notification
2. Notification background changes from blue to white
3. "New" badge disappears
4. Unread count decreases

**All at Once:**
1. From Notifications page, click "Mark all as read"
2. All notifications change to read state
3. Badge count on navbar becomes 0

### Test Scenario 4: Filter Notifications

1. Go to Notifications page
2. Click "Unread" tab - only unread notifications show
3. Click "Read" tab - only read notifications show
4. Click "All" tab - all notifications show
5. Each tab shows count in parentheses

### Test Scenario 5: Real-time Updates

1. Have NotificationsPage open in one browser/tab
2. In another browser/tab (as supervisor), create a new review
3. Wait up to 30 seconds
4. First tab should:
   - Show new notification in list
   - Navbar badge should update
   - Unread count increments

---

## File Locations

### Backend Files Modified:
- ✅ `backend/notifications/models.py` - Added log_review field
- ✅ `backend/notifications/serializers.py` - Added log_review_details method
- ✅ `backend/notifications/views.py` - Added unread_count and mark_all_as_read endpoints
- ✅ `backend/notifications/migrations/0002_add_logreview_reference.py` - New migration
- ✅ `backend/reviews/apps.py` - Registered signals
- ✅ `backend/reviews/signals.py` - New signal handler (auto-create notifications)

### Frontend Files Modified:
- ✅ `frontend/src/components/layout/Navbar.jsx` - Added polling and simplified navigation
- ✅ `frontend/src/pages/NotificationsPage.jsx` - Enhanced with feedback handling and navigation

---

## API Endpoints Available

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications/notifications/` | List all notifications for current user |
| GET | `/notifications/notifications/unread_count/` | Get count of unread notifications |
| POST | `/notifications/notifications/mark_all_as_read/` | Mark all unread as read |
| PATCH | `/notifications/notifications/{id}/` | Mark single notification as read |
| DELETE | `/notifications/notifications/{id}/` | Delete a notification |

### Example: Get Unread Count
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/notifications/notifications/unread_count/
```

Response:
```json
{ "unread_count": 3 }
```

---

## Troubleshooting

### Issue: Notification not created when feedback is added

**Solution:**
1. Verify `reviews/signals.py` file exists and has the signal handler
2. Check `reviews/apps.py` has `import reviews.signals` in `ready()`
3. Check Django logs for any import errors
4. Restart backend server

### Issue: Navbar badge not updating

**Solution:**
1. Open browser DevTools → Network tab
2. Should see API calls to `/notifications/notifications/` every 30 seconds
3. If not, check that JavaScript console has no errors
4. Verify notificationsAPI.getNotifications() is working

### Issue: Can't navigate to log from notification

**Solution:**
1. Check that `log_review_details` is in API response:
   ```bash
   curl -H "Authorization: Token YOUR_TOKEN" \
     http://localhost:8000/api/notifications/notifications/
   ```
2. Look for `log_review_details` object with `log_id` field
3. If missing, check that LogReview has the ForeignKey relationship set correctly
4. Verify `log_review` field was created (run migration if needed)

### Issue: Styling looks off

**Solution:**
- Colors might vary based on theme
- Key colors:
  - Feedback: Purple (#9c27b0)
  - Unread background: Light blue (#f0f7ff)
  - Read background: White (#fff)
- Update color hex values in NotificationsPage if needed

---

## Key Features Summary

🔔 **Smart Notifications**
- Automatic creation when supervisor adds feedback
- Links to specific log for easy access

📊 **Rich Information Display**
- Supervisor name
- Week number
- Review status (Approved/Needs Revision/Rejected)
- Star rating (1-5)
- Supervisor comments preview

🔄 **Real-time Awareness**
- Badge on navbar shows unread count
- Refreshes every 30 seconds
- Disappears when all read

📱 **Mobile Friendly**
- Responsive design
- Touch-friendly buttons
- Works on all screen sizes

✅ **User Control**
- Mark individual or all as read
- Delete notifications
- Filter by read status
- View details without navigation

---

## Performance Considerations

- **Polling Interval**: Set to 30 seconds (configurable in Navbar.jsx)
- **Database**: Notifications auto-cleanup recommended for old records
- **API**: Uses filtered queryset (only user's notifications)
- **Frontend**: Efficient re-renders with React hooks

---

## Next Steps (Optional Enhancements)

1. **WebSocket Integration** - Real-time notifications without polling
2. **Email Notifications** - Send email when feedback is added
3. **Mobile Push Notifications** - For PWA/mobile apps
4. **Notification Preferences** - Let students customize what types to receive
5. **Batch Notifications** - Daily digest emails
6. **Notification Archive** - Auto-delete old notifications after 30 days
