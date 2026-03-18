import uuid
from django.db import models
from django.utils import timezone
from placements.models import InternshipPlacement
from accounts.models import Supervisor


class EvaluationCriteria(models.Model):
    criteria_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2)  # e.g., 25.00 for 25%
    max_score = models.DecimalField(max_digits=5, decimal_places=2)

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

    def __str__(self):
        return f"Evaluation for {self.placement}"


class EvaluationScore(models.Model):
    score_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE)
    criteria = models.ForeignKey(EvaluationCriteria, on_delete=models.CASCADE)
    score = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        unique_together = ('evaluation', 'criteria')

    def __str__(self):
        return f"{self.criteria} score for {self.evaluation}"


class ScoreBreakdown(models.Model):
    score_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    placement = models.OneToOneField(InternshipPlacement, on_delete=models.CASCADE)
    supervisor_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    academic_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    logbook_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    final_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=10, null=True, blank=True)

    def __str__(self):
        return f"Score breakdown for {self.placement}"
    final_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    grade = models.CharField(max_length=10, null=True, blank=True)

    def __str__(self):
        return f"Score breakdown for {self.placement}"
