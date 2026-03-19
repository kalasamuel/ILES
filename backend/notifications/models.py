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
    ]

    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

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
