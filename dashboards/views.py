from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg
from .models import DashboardMetric
from .serializers import DashboardMetricSerializer
from placements.models import InternshipPlacement
from accounts.models import Student
from evaluations.models import ScoreBreakdown
from reviews.models import LogReview


class DashboardMetricViewSet(viewsets.ModelViewSet):
    queryset = DashboardMetric.objects.all()
    serializer_class = DashboardMetricSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def refresh_metrics(self, request):
        # Calculate and update metrics
        internships_completed = InternshipPlacement.objects.filter(status='completed').count()
        total_students = Student.objects.count()
        active_placements = InternshipPlacement.objects.filter(status__in=['pending', 'approved']).count()
        average_score = ScoreBreakdown.objects.aggregate(avg=Avg('final_score'))['avg'] or 0
        pending_reviews = LogReview.objects.filter(status='needs_revision').count()

        DashboardMetric.objects.update_or_create(
            metric_type='internships_completed',
            defaults={'value': internships_completed}
        )
        DashboardMetric.objects.update_or_create(
            metric_type='total_students',
            defaults={'value': total_students}
        )
        DashboardMetric.objects.update_or_create(
            metric_type='active_placements',
            defaults={'value': active_placements}
        )
        DashboardMetric.objects.update_or_create(
            metric_type='average_score',
            defaults={'value': average_score}
        )
        DashboardMetric.objects.update_or_create(
            metric_type='pending_reviews',
            defaults={'value': pending_reviews}
        )

        metrics = DashboardMetric.objects.all()
        serializer = self.get_serializer(metrics, many=True)
        return Response(serializer.data)
