from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from .models import WeeklyLog, LogAttachment
from .serializers import WeeklyLogSerializer, LogAttachmentSerializer
from reviews.models import WorkflowHistory
from accounts.models import Student, Supervisor


class WeeklyLogViewSet(viewsets.ModelViewSet):
    queryset = WeeklyLog.objects.all()
    serializer_class = WeeklyLogSerializer
    permission_classes = [IsAuthenticated]

    def _role_name(self, user):
        return (user.role.role_name if user.role else '').strip().lower()

    def _assert_student_or_admin_for_mutation(self, user):
        role_name = self._role_name(user)
        if role_name == 'admin' or 'student' in role_name:
            return
        raise PermissionDenied('Only students can modify weekly logs.')

    def _assert_log_owner_for_student(self, user, log):
        role_name = self._role_name(user)
        if role_name == 'admin':
            return
        if 'student' in role_name and log.placement.student.user_id == user.user_id:
            return
        raise PermissionDenied('You can only modify your own weekly logs.')

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

    def perform_update(self, serializer):
        old_status = self.get_object().status
        log = serializer.save()
        if old_status != log.status:
            WorkflowHistory.objects.create(
                entity_type='log',
                entity_id=log.log_id,
                previous_status=old_status,
                new_status=log.status,
                changed_by=self.request.user
            )

    def create(self, request, *args, **kwargs):
        self._assert_student_or_admin_for_mutation(request.user)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._assert_student_or_admin_for_mutation(request.user)
        instance = self.get_object()
        self._assert_log_owner_for_student(request.user, instance)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._assert_student_or_admin_for_mutation(request.user)
        instance = self.get_object()
        self._assert_log_owner_for_student(request.user, instance)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._assert_student_or_admin_for_mutation(request.user)
        instance = self.get_object()
        self._assert_log_owner_for_student(request.user, instance)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        log = self.get_object()
        self._assert_log_owner_for_student(request.user, log)

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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
