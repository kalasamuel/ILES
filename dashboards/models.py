import uuid
from django.db import models
from django.utils import timezone


class DashboardMetric(models.Model):
    METRIC_TYPES = [
        ('internships_completed', 'Internships Completed'),
        ('average_score', 'Average Score'),
        ('pending_reviews', 'Pending Reviews'),
        ('total_students', 'Total Students'),
        ('active_placements', 'Active Placements'),
    ]

    metric_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_type = models.CharField(max_length=50, choices=METRIC_TYPES)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    calculated_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.metric_type}: {self.value}"
