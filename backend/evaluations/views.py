from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from .models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown
from .serializers import EvaluationCriteriaSerializer, EvaluationSerializer, EvaluationScoreSerializer, ScoreBreakdownSerializer


class EvaluationCriteriaViewSet(viewsets.ModelViewSet):
    queryset = EvaluationCriteria.objects.all()
    serializer_class = EvaluationCriteriaSerializer
    permission_classes = [IsAuthenticated]


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, request):
        evaluation = super().perform_create(request)
        # Calculate total score
        total_score = evaluation.evaluationscore_set.aggregate(
            total=Sum('score')
        )['total'] or 0
        evaluation.total_score = total_score
        evaluation.save()
        # Update score breakdown
        self._update_score_breakdown(evaluation.placement)
        return evaluation

    def _update_score_breakdown(self, placement):
        # Calculate scores
        evaluation = Evaluation.objects.filter(placement=placement).first()
        if not evaluation:
            return

        academic_score = evaluation.total_score

        # Supervisor score from reviews
        from reviews.models import LogReview
        from django.db.models import Avg
        supervisor_reviews = LogReview.objects.filter(
            log__placement=placement,
            supervisor__supervisor_type='workplace'
        )
        supervisor_score = supervisor_reviews.aggregate(
            avg_rating=Avg('rating')
        )['avg_rating'] or 0

        # Logbook score (average of approved logs)
        from logbooks.models import WeeklyLog
        approved_logs = WeeklyLog.objects.filter(
            placement=placement,
            status='approved'
        ).count()
        total_logs = WeeklyLog.objects.filter(placement=placement).count()
        logbook_score = (approved_logs / total_logs * 100) if total_logs > 0 else 0

        # Weighted final score
        final_score = (supervisor_score * 0.4) + (academic_score * 0.3) + (logbook_score * 0.3)

        # Determine grade
        if final_score >= 90:
            grade = 'A'
        elif final_score >= 80:
            grade = 'B'
        elif final_score >= 70:
            grade = 'C'
        elif final_score >= 60:
            grade = 'D'
        else:
            grade = 'F'

        ScoreBreakdown.objects.update_or_create(
            placement=placement,
            defaults={
                'supervisor_score': supervisor_score,
                'academic_score': academic_score,
                'logbook_score': logbook_score,
                'final_score': final_score,
                'grade': grade
            }
        )


class EvaluationScoreViewSet(viewsets.ModelViewSet):
    queryset = EvaluationScore.objects.all()
    serializer_class = EvaluationScoreSerializer
    permission_classes = [IsAuthenticated]


class ScoreBreakdownViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ScoreBreakdown.objects.all()
    serializer_class = ScoreBreakdownSerializer
    permission_classes = [IsAuthenticated]
