from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import WeeklyLog, LogAttachment
from .serializers import WeeklyLogSerializer, LogAttachmentSerializer
from reviews.models import WorkflowHistory
from accounts.models import Student, Supervisor


class WeeklyLogViewSet(viewsets.ModelViewSet):
    queryset = WeeklyLog.objects.all()
    serializer_class = WeeklyLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return WeeklyLog.objects.none()

        role_name = (user.role.role_name if user.role else '').strip().lower()

        if role_name == 'admin':
            return self.queryset

        if 'student' in role_name:
            return self.queryset.filter(placement__student__user=user)

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return self.queryset
            return WeeklyLog.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return self.queryset.filter(placement__workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(placement__student__user__department=supervisor.department)
            return self.queryset.filter(placement__academic_supervisor=supervisor)

        return WeeklyLog.objects.none()

    def perform_update(self, request):
        old_status = self.get_object().status
        log = super().perform_update(request)
        if old_status != log.status:
            WorkflowHistory.objects.create(
                entity_type='log',
                entity_id=log.log_id,
                previous_status=old_status,
                new_status=log.status,
                changed_by=request.user
            )
        return log

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        log = self.get_object()
        if log.status == 'draft':
            log.status = 'submitted'
            log.submitted_at = timezone.now()
            log.save()
            WorkflowHistory.objects.create(
                entity_type='log',
                entity_id=log.log_id,
                previous_status='draft',
                new_status='submitted',
                changed_by=request.user
            )
            return Response({'message': 'Log submitted'})
        return Response({'error': 'Cannot submit this log'}, status=status.HTTP_400_BAD_REQUEST)


class LogAttachmentViewSet(viewsets.ModelViewSet):
    queryset = LogAttachment.objects.all()
    serializer_class = LogAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return LogAttachment.objects.none()

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
            return LogAttachment.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return self.queryset.filter(log__placement__workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(log__placement__student__user__department=supervisor.department)
            return self.queryset.filter(log__placement__academic_supervisor=supervisor)

        return LogAttachment.objects.none()
