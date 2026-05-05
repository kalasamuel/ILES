import uuid
from django.db import models
from django.utils import timezone
from accounts.models import User


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('log_review_pending', 'Log Review Pending'),
        ('submission_deadline', 'Submission Deadline'),
        ('evaluation_completed', 'Evaluation Completed'),
        ('placement_approved', 'Placement Approved'),
        ('placement_rejected', 'Placement Rejected'),
        ('feedback_added', 'Feedback Added'),
        ('log_submitted', 'Log Submitted'),
        ('system_health_update', 'System Health Update'),
        ('server_status_update', 'Server Status Update'),
        ('pending_updates', 'Pending Updates'),
        ('system_alert', 'System Alert'),
        ('new_company_added', 'New Company Added'),
        ('login_alert', 'Login Alert'),
    ]

    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    details = models.JSONField(default=dict, blank=True)
    # Reference to the log review that triggered this notification (for student feedback)
    log_review = models.ForeignKey('reviews.LogReview', on_delete=models.CASCADE, null=True, blank=True)
    # Reference to the log that triggered this notification (for supervisor log submission)
    log = models.ForeignKey('logbooks.WeeklyLog', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"Notification for {self.user}: {self.message[:50]}"


class Deadline(models.Model):
    deadline_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    week_number = models.IntegerField()
    submission_deadline = models.DateField()

    class Meta:
        unique_together = ('week_number',)

    def __str__(self):
        return f"Deadline for week {self.week_number}: {self.submission_deadline}"


class PushSubscription(models.Model):
    """Stores a browser push subscription for a user (VAPID-based)."""
    subscription_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.TextField()
    p256dh = models.CharField(max_length=512)
    auth = models.CharField(max_length=512)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = (('user', 'endpoint'),)

    def __str__(self):
        return f"PushSubscription for {self.user.email} -> {self.endpoint[:60]}"


class LoginHistory(models.Model):
    """Tracks user login events with device and location information."""
    login_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history')
    ip_address = models.GenericIPAddressField()
    device_name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=50, blank=True)  # e.g., 'mobile', 'tablet', 'desktop'
    browser = models.CharField(max_length=100, blank=True)
    operating_system = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=255, blank=True)  # e.g., 'New York, US' or 'Unknown'
    country = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    user_agent = models.TextField()
    logged_in_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-logged_in_at']
        indexes = [
            models.Index(fields=['user', '-logged_in_at']),
        ]

    def __str__(self):
        return f"Login by {self.user.email} from {self.device_name} ({self.location}) on {self.logged_in_at}"
