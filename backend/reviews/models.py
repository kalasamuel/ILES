import uuid
from django.db import models
from django.utils import timezone
from logbooks.models import WeeklyLog
from accounts.models import Supervisor


class LogReview(models.Model):
    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('needs_revision', 'Needs Revision'),
        ('rejected', 'Rejected'),
    ]

    review_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    log = models.ForeignKey(WeeklyLog, on_delete=models.CASCADE)
    supervisor = models.ForeignKey(Supervisor, on_delete=models.CASCADE)
    comments = models.TextField()
    rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)  # e.g., 1.0 to 5.0
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    reviewed_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Review for {self.log} by {self.supervisor}"


class WorkflowHistory(models.Model):
    history_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity_type = models.CharField(max_length=50)  # e.g., 'placement', 'log'
    entity_id = models.UUIDField()
    previous_status = models.CharField(max_length=50, null=True, blank=True)
    new_status = models.CharField(max_length=50)
    changed_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    changed_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.entity_type} {self.entity_id} status changed to {self.new_status}"
