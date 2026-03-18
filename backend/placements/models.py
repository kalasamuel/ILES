import uuid
from django.db import models
from django.utils import timezone
from accounts.models import Student, Supervisor
from organizations.models import Organization


class InternshipPlacement(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]

    placement_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    workplace_supervisor = models.ForeignKey(Supervisor, on_delete=models.CASCADE, related_name='workplace_placements')
    academic_supervisor = models.ForeignKey(Supervisor, on_delete=models.CASCADE, related_name='academic_placements')
    start_date = models.DateField()
    end_date = models.DateField()
    position_title = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.student} at {self.organization}"


class PlacementDocument(models.Model):
    DOCUMENT_TYPES = [
        ('introduction_letter', 'Introduction Letter'),
        ('acceptance_letter', 'Acceptance Letter'),
        ('contract', 'Contract'),
    ]

    document_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    placement = models.ForeignKey(InternshipPlacement, on_delete=models.CASCADE)
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    file_url = models.URLField()
    uploaded_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.document_type} for {self.placement}"
