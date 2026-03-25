from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import LogReview, WorkflowHistory
from .serializers import LogReviewSerializer, WorkflowHistorySerializer
from accounts.models import Student, Supervisor
from logbooks.models import WeeklyLog
from placements.models import InternshipPlacement


class LogReviewViewSet(viewsets.ModelViewSet):
    queryset = LogReview.objects.all()
    serializer_class = LogReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return LogReview.objects.none()

        role_name = (user.role.role_name if user.role else '').strip().lower()

        if role_name == 'admin':
            return self.queryset

        if 'student' in role_name:
            return self.queryset.filter(log__placement__student__user=user)

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return self.queryset
            return LogReview.objects.none()

        return self.queryset.filter(supervisor=supervisor)

    def perform_create(self, request):
        review = super().perform_create(request)
        # Update log status to reviewed
        log = review.log
        log.status = 'reviewed'
        log.save()
        WorkflowHistory.objects.create(
            entity_type='log',
            entity_id=log.log_id,
            previous_status='submitted',
            new_status='reviewed',
            changed_by=request.user
        )
        return review

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        review = self.get_object()
        review.status = 'approved'
        review.save()
        log = review.log
        log.status = 'approved'
        log.save()
        WorkflowHistory.objects.create(
            entity_type='log',
            entity_id=log.log_id,
            previous_status='reviewed',
            new_status='approved',
            changed_by=request.user
        )
        return Response({'message': 'Log approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        review = self.get_object()
        review.status = 'rejected'
        review.save()
        log = review.log
        log.status = 'rejected'
        log.save()
        WorkflowHistory.objects.create(
            entity_type='log',
            entity_id=log.log_id,
            previous_status='reviewed',
            new_status='rejected',
            changed_by=request.user
        )
        return Response({'message': 'Log rejected'})


class WorkflowHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WorkflowHistory.objects.all()
    serializer_class = WorkflowHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return WorkflowHistory.objects.none()

        role_name = (user.role.role_name if user.role else '').strip().lower()

        if role_name == 'admin':
            return self.queryset

        if 'student' in role_name:
            student_log_ids = WeeklyLog.objects.filter(placement__student__user=user).values_list('log_id', flat=True)
            student_placement_ids = InternshipPlacement.objects.filter(student__user=user).values_list('placement_id', flat=True)
            return self.queryset.filter(entity_id__in=list(student_log_ids) + list(student_placement_ids))

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return self.queryset
            return WorkflowHistory.objects.none()

        supervised_placements = []
        if supervisor.supervisor_type == 'workplace':
            supervised_placements = supervisor.workplace_placements.values_list('placement_id', flat=True)
            supervised_logs = supervisor.workplace_placements.values_list('weeklylog__log_id', flat=True)
        else:
            supervised_placements = supervisor.academic_placements.values_list('placement_id', flat=True)
            supervised_logs = supervisor.academic_placements.values_list('weeklylog__log_id', flat=True)

        return self.queryset.filter(entity_id__in=list(supervised_placements) + list(supervised_logs))
