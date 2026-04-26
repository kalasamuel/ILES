import uuid
from django.db import models
from django.core.exceptions import ValidationError
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

class EvaluationCriteria(models.Model):
    criteria_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2)  # e.g., 25.00 for 25%
    max_score = models.DecimalField(max_digits=5, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()

    def __str__(self):
        return self.name 

class Evaluation(models.Model):
    evaluation_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    placement = models.OneToOneField(InternshipPlacement, on_delete=models.CASCADE)
    evaluator = models.ForeignKey(Supervisor, on_delete=models.CASCADE)
    evaluation_date = models.DateField(default=timezone.now)
    total_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=10, null=True, blank=True)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    history = HistoricalRecords() 

    def clean(self):
        super().clean()
        if self.evaluation_date and self.evaluation_date > timezone.now().date():
            raise ValidationError({'evaluation_date': "Evaluation date cannot be in the future."})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Evaluation for {self.placement}"