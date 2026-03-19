from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg
from django.db import transaction

from .models import DashboardMetric
from .serializers import DashboardMetricSerializer
from placements.models import InternshipPlacement
from accounts.models import Student
from evaluations.models import ScoreBreakdown
from reviews.models import LogReview


class DashboardMetricViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage DashboardMetric entries.

    Standard CRUD operations:
    - list, retrieve, create, update, partial_update, destroy

    Custom actions:
    - refresh_metrics: Recalculates key dashboard metrics and updates the database.
    """
    queryset = DashboardMetric.objects.all().order_by('metric_type')
    serializer_class = DashboardMetricSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='refresh-metrics')
    def refresh_metrics(self, request):
        """
        Recalculate and update dashboard metrics:
        - internships_completed
        - total_students
        - active_placements
        - average_score
        - pending_reviews

        Returns all updated metrics in serialized form.
        """
        with transaction.atomic():
            metrics_data = {
                'internships_completed': InternshipPlacement.objects.filter(status='completed').count(),
                'total_students': Student.objects.count(),
                'active_placements': InternshipPlacement.objects.filter(status__in=['pending', 'approved']).count(),
                'average_score': ScoreBreakdown.objects.aggregate(avg=Avg('final_score'))['avg'] or 0,
                'pending_reviews': LogReview.objects.filter(status='needs_revision').count(),
            }

            # Update or create metrics
            for metric_type, value in metrics_data.items():
                DashboardMetric.objects.update_or_create(
                    metric_type=metric_type,
                    defaults={'value': value}
                )

        # Fetch updated metrics and serialize
        metrics = DashboardMetric.objects.all().order_by('metric_type')
        serializer = self.get_serializer(metrics, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)