import uuid
from django.db import models
from django.utils import timezone
from simple_history.models import HistoricalRecords  # For tracking changes


class DashboardMetric(models.Model):
    """
    Stores key dashboard metrics for the system, with historical tracking.
    """

    METRIC_TYPES = [
        ('internships_completed', 'Internships Completed'),
        ('average_score', 'Average Score'),
        ('pending_reviews', 'Pending Reviews'),
        ('total_students', 'Total Students'),
        ('active_placements', 'Active Placements'),
    ]

    metric_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the metric"
    )
    metric_type = models.CharField(
        max_length=50,
        choices=METRIC_TYPES,
        help_text="Type of metric"
    )
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Current value of the metric"
    )
    calculated_at = models.DateTimeField(
        default=timezone.now,
        help_text="Timestamp when this metric was calculated"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Record creation timestamp"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Record last update timestamp"
    )

    # Track historical changes
    history = HistoricalRecords()

    class Meta:
        ordering = ['-calculated_at']  # Latest metrics first
        indexes = [
            models.Index(fields=['metric_type']),
            models.Index(fields=['calculated_at']),
        ]
        unique_together = ('metric_type', 'calculated_at')  # One metric per type per timestamp
        verbose_name = "Dashboard Metric"
        verbose_name_plural = "Dashboard Metrics"

    def __str__(self):
        return f"{self.get_metric_type_display()}: {self.value} (calculated at {self.calculated_at:%Y-%m-%d %H:%M})"
 # Optional: convenience method for incrementing metrics safely
    def increment(self, amount=1):
        """
        Increment the metric's value by a given amount.
        Ensures historical record is tracked automatically.
        """
        self.value += amount
        self.save()   