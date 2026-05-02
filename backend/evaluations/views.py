from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Sum, Avg
from decimal import Decimal
from .models import EvaluationCriteria, Evaluation, EvaluationScore, ScoreBreakdown
from .serializers import EvaluationCriteriaSerializer, EvaluationSerializer, EvaluationScoreSerializer, ScoreBreakdownSerializer
from accounts.models import Student, Supervisor


def _to_decimal(value, default='0'):
    if value is None:
        return Decimal(default)
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _clamp_percentage(value):
    if value < Decimal('0'):
        return Decimal('0')
    if value > Decimal('100'):
        return Decimal('100')
    return value


def _grade_for_score(score):
    if score >= Decimal('90'):
        return 'A'
    if score >= Decimal('80'):
        return 'B'
    if score >= Decimal('70'):
        return 'C'
    if score >= Decimal('60'):
        return 'D'
    return 'F'


def _calculate_academic_score_percentage(evaluation):
    scores = evaluation.evaluationscore_set.select_related('criteria').all()
    if not scores.exists():
        return Decimal('0.00')

    weighted_total = Decimal('0')
    total_weight = Decimal('0')
    raw_score_sum = Decimal('0')
    raw_max_sum = Decimal('0')

    for entry in scores:
        score_value = _to_decimal(entry.score)
        max_score = _to_decimal(getattr(entry.criteria, 'max_score', 0))
        weight = _to_decimal(getattr(entry.criteria, 'weight_percentage', 0))

        if max_score > 0:
            percentage = _clamp_percentage((score_value / max_score) * Decimal('100'))
            raw_score_sum += score_value
            raw_max_sum += max_score

            if weight > 0:
                weighted_total += percentage * weight
                total_weight += weight

    if total_weight > 0:
        return _clamp_percentage(weighted_total / total_weight).quantize(Decimal('0.01'))

    if raw_max_sum > 0:
        return _clamp_percentage((raw_score_sum / raw_max_sum) * Decimal('100')).quantize(Decimal('0.01'))

    return Decimal('0.00')


def _recalculate_evaluation_and_breakdown(evaluation):
    if not evaluation:
        return

    placement = evaluation.placement

    academic_score = _calculate_academic_score_percentage(evaluation)
    evaluation.total_score = academic_score
    evaluation.grade = _grade_for_score(academic_score)
    evaluation.save(update_fields=['total_score', 'grade'])

    from reviews.models import LogReview
    from logbooks.models import WeeklyLog

    avg_rating = LogReview.objects.filter(
        log__placement=placement,
        supervisor__supervisor_type='workplace'
    ).aggregate(avg_rating=Avg('rating'))['avg_rating']

    # Convert workplace review ratings (typically 0-5) to a percentage scale.
    supervisor_score = _clamp_percentage(_to_decimal(avg_rating) * Decimal('20'))

    approved_logs = WeeklyLog.objects.filter(
        placement=placement,
        status='approved'
    ).count()
    total_logs = WeeklyLog.objects.filter(placement=placement).count()
    logbook_score = Decimal('0')
    if total_logs > 0:
        logbook_score = _clamp_percentage((Decimal(approved_logs) / Decimal(total_logs)) * Decimal('100'))

    final_score = (
        (supervisor_score * Decimal('0.4')) +
        (academic_score * Decimal('0.3')) +
        (logbook_score * Decimal('0.3'))
    ).quantize(Decimal('0.01'))

    ScoreBreakdown.objects.update_or_create(
        placement=placement,
        defaults={
            'supervisor_score': supervisor_score.quantize(Decimal('0.01')),
            'academic_score': academic_score,
            'logbook_score': logbook_score.quantize(Decimal('0.01')),
            'final_score': final_score,
            'grade': _grade_for_score(final_score),
        }
    )


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
            if supervisor.organization_id:
                return self.queryset.filter(placement__organization=supervisor.organization)
            return self.queryset.filter(placement__workplace_supervisor=supervisor)

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

        _recalculate_evaluation_and_breakdown(evaluation)

    def perform_update(self, serializer):
        evaluation = serializer.save()
        _recalculate_evaluation_and_breakdown(evaluation)

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

    @action(detail=False, methods=['post'], url_path='recalculate-my-summaries')
    def recalculate_my_summaries(self, request):
        evaluations = self.get_queryset().select_related('placement')
        updated = 0

        for evaluation in evaluations:
            _recalculate_evaluation_and_breakdown(evaluation)
            updated += 1

        return Response({
            'updated_evaluations': updated,
            'message': 'Evaluation summaries recalculated successfully.',
        }, status=status.HTTP_200_OK)


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
            if supervisor.organization_id:
                return self.queryset.filter(evaluation__placement__organization=supervisor.organization)
            return self.queryset.filter(evaluation__placement__workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(evaluation__placement__student__user__department=supervisor.department)
            return self.queryset.filter(evaluation__placement__academic_supervisor=supervisor)

        return EvaluationScore.objects.none()

    def create(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        score = serializer.save()
        _recalculate_evaluation_and_breakdown(score.evaluation)

    def update(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        score = serializer.save()
        _recalculate_evaluation_and_breakdown(score.evaluation)

    def partial_update(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._assert_academic_or_admin(request.user)
        score = self.get_object()
        evaluation = score.evaluation
        response = super().destroy(request, *args, **kwargs)
        _recalculate_evaluation_and_breakdown(evaluation)
        return response


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
            if supervisor.organization_id:
                return self.queryset.filter(placement__organization=supervisor.organization)
            return self.queryset.filter(placement__workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(placement__student__user__department=supervisor.department)
            return self.queryset.filter(placement__academic_supervisor=supervisor)

        return ScoreBreakdown.objects.none()
