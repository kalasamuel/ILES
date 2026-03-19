import uuid
from django.db import models
from django.utils import timezone
from placements.models import InternshipPlacement


class WeeklyLog(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    placement = models.ForeignKey(InternshipPlacement, on_delete=models.CASCADE)
    week_number = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    activities_performed = models.TextField()
    skills_learned = models.TextField()
    challenges = models.TextField()
    solutions = models.TextField()
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('placement', 'week_number')

    def __str__(self):
        return f"Week {self.week_number} for {self.placement}"


class LogAttachment(models.Model):
    attachment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    log = models.ForeignKey(WeeklyLog, on_delete=models.CASCADE)
    file_url = models.URLField()
    description = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Attachment for {self.log}"
