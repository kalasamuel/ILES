from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Sum
from .models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown
from .serializers import EvaluationCriteriaSerializer, EvaluationSerializer, EvaluationScoreSerializer, ScoreBreakdownSerializer
from accounts.models import Student, Supervisor


class EvaluationCriteriaViewSet(viewsets.ModelViewSet):
    queryset = EvaluationCriteria.objects.all()
    serializer_class = EvaluationCriteriaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role_name = (user.role.role_name if user.role else '').strip().lower()
        if role_name == 'admin':
            return self.queryset

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            return EvaluationCriteria.objects.none()

        if supervisor.supervisor_type == 'academic':
            return self.queryset
        return EvaluationCriteria.objects.none()

    def _assert_can_manage_criteria(self, user):
        role_name = (user.role.role_name if user.role else '').strip().lower()
        if role_name == 'admin':
            return

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            raise PermissionDenied('Only academic supervisors can access evaluation criteria.')

        if supervisor.supervisor_type != 'academic':
            raise PermissionDenied('Only academic supervisors can access evaluation criteria.')

    def create(self, request, *args, **kwargs):
        self._assert_can_manage_criteria(request.user)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._assert_can_manage_criteria(request.user)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._assert_can_manage_criteria(request.user)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._assert_can_manage_criteria(request.user)
        return super().destroy(request, *args, **kwargs)


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer
    permission_classes = [IsAuthenticated]

    def _get_supervisor(self, user):
        try:
            return Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            return None

    def _assert_academic_or_admin(self, user):
        role_name = (user.role.role_name if user.role else '').strip().lower()
        if role_name == 'admin':
            return None

        supervisor = self._get_supervisor(user)
        if not supervisor or supervisor.supervisor_type != 'academic':
            raise PermissionDenied('Only academic supervisors can create or edit evaluations.')
        return supervisor

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Evaluation.objects.none()

        role_name = (user.role.role_name if user.role else '').strip().lower()

        if role_name == 'admin':
            return self.queryset

        if 'student' in role_name:
            return self.queryset.filter(placement__student__user=user)

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return Evaluation.objects.none()
            return Evaluation.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return Evaluation.objects.none()

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(placement__student__user__department=supervisor.department)
            return self.queryset.filter(placement__academic_supervisor=supervisor)

        return Evaluation.objects.none()

    def perform_create(self, serializer):
        supervisor = self._assert_academic_or_admin(self.request.user)

        placement = serializer.validated_data.get('placement')
        if supervisor:
            if placement.academic_supervisor_id != supervisor.supervisor_id:
                raise PermissionDenied('You can only evaluate students assigned to you.')
            evaluation = serializer.save(evaluator=supervisor)
        else:
            evaluation = serializer.save()

        # Calculate total score
        total_score = evaluation.evaluationscore_set.aggregate(
            total=Sum('score')
        )['total'] or 0
        evaluation.total_score = total_score
        evaluation.save()
        # Update score breakdown
        self._update_score_breakdown(evaluation.placement)

    def create(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().destroy(request, *args, **kwargs)

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

    def _get_supervisor(self, user):
        try:
            return Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            return None

    def _assert_academic_or_admin(self, user):
        role_name = (user.role.role_name if user.role else '').strip().lower()
        if role_name == 'admin':
            return None

        supervisor = self._get_supervisor(user)
        if not supervisor or supervisor.supervisor_type != 'academic':
            raise PermissionDenied('Only academic supervisors can manage evaluation scores.')
        return supervisor

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return EvaluationScore.objects.none()

        role_name = (user.role.role_name if user.role else '').strip().lower()

        if role_name == 'admin':
            return self.queryset

        if 'student' in role_name:
            return self.queryset.filter(evaluation__placement__student__user=user)

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return EvaluationScore.objects.none()
            return EvaluationScore.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return EvaluationScore.objects.none()

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(evaluation__placement__student__user__department=supervisor.department)
            return self.queryset.filter(evaluation__placement__academic_supervisor=supervisor)

        return EvaluationScore.objects.none()

    def create(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().destroy(request, *args, **kwargs)


class ScoreBreakdownViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ScoreBreakdown.objects.all()
    serializer_class = ScoreBreakdownSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ScoreBreakdown.objects.none()

        role_name = (user.role.role_name if user.role else '').strip().lower()

        if role_name == 'admin':
            return self.queryset

        if 'student' in role_name:
            return self.queryset.filter(placement__student__user=user)

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return ScoreBreakdown.objects.none()
            return ScoreBreakdown.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return ScoreBreakdown.objects.none()

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(placement__student__user__department=supervisor.department)
            return self.queryset.filter(placement__academic_supervisor=supervisor)

        return ScoreBreakdown.objects.none()
