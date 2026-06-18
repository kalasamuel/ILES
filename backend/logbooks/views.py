from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from datetime import datetime
from django.utils import timezone
from django.db.models import Prefetch
from .models import WeeklyLog, LogAttachment, FinalReport
from .serializers import WeeklyLogSerializer, LogAttachmentSerializer, FinalReportSerializer
from reviews.models import WorkflowHistory, LogReview
from accounts.models import Student, Supervisor, UserSettings


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

    def _get_supervisor(self, user):
        try:
            return Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            return None

    def _assert_supervisor_can_review_log(self, user, log):
        role_name = self._role_name(user)
        if role_name == 'admin':
            return None

        supervisor = self._get_supervisor(user)
        if not supervisor:
            raise PermissionDenied('Only supervisors can review weekly logs.')

        if supervisor.supervisor_type == 'workplace' and log.placement.workplace_supervisor_id == supervisor.supervisor_id:
            return supervisor

        if supervisor.supervisor_type == 'academic' and log.placement.academic_supervisor_id == supervisor.supervisor_id:
            return supervisor

        raise PermissionDenied('You can only review weekly logs for interns assigned to you.')

    def _build_review_payload(self, request, fallback_comments, status_value):
        comments = (request.data.get('comments') or '').strip() or fallback_comments
        rating = request.data.get('rating', None)
        if rating == '':
            rating = None
        return {
            'comments': comments,
            'rating': rating,
            'status': status_value,
        }

    def _upsert_log_review(self, log, supervisor, payload):
        review, created = LogReview.objects.get_or_create(
            log=log,
            supervisor=supervisor,
            defaults={
                'comments': payload['comments'],
                'rating': payload['rating'],
                'status': payload['status'],
                'reviewed_at': timezone.now(),
            }
        )

        if not created:
            review.comments = payload['comments']
            review.rating = payload['rating']
            review.status = payload['status']
            review.reviewed_at = timezone.now()
            review.save(update_fields=['comments', 'rating', 'status', 'reviewed_at'])

        return review

    def _update_log_status_with_history(self, log, new_status, user):
        old_status = log.status
        if old_status != new_status:
            log.status = new_status
            log.save(update_fields=['status'])
            WorkflowHistory.objects.create(
                entity_type='log',
                entity_id=log.log_id,
                previous_status=old_status,
                new_status=new_status,
                changed_by=user
            )

    def _schedule_log(self, log, scheduled_submission_at, user):
        old_status = log.status
        log.status = 'scheduled'
        log.scheduled_submission_at = scheduled_submission_at
        log.submitted_at = None
        log.save(update_fields=['status', 'scheduled_submission_at', 'submitted_at'])

        if old_status != 'scheduled':
            WorkflowHistory.objects.create(
                entity_type='log',
                entity_id=log.log_id,
                previous_status=old_status,
                new_status='scheduled',
                changed_by=user,
            )

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return WeeklyLog.objects.none()

        role_name = (user.role.role_name if user.role else '').strip().lower()

        # Optimize queries with select_related and prefetch_related
        queryset = self.queryset.select_related(
            'placement__student__user__role',
            'placement__student__user__department',
            'placement__organization',
            'placement__workplace_supervisor__user__role',
            'placement__academic_supervisor__user__role'
        ).prefetch_related(
            Prefetch('placement__student__user__settings'),
            Prefetch('placement__workplace_supervisor__user__settings'),
            Prefetch('placement__academic_supervisor__user__settings')
        )

        if role_name == 'admin':
            return queryset

        if 'student' in role_name:
            return queryset.filter(placement__student__user=user)

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return queryset
            return WeeklyLog.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return queryset.filter(placement__workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            return queryset.filter(placement__academic_supervisor=supervisor)

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

    @action(detail=True, methods=['post'])
    def schedule(self, request, pk=None):
        log = self.get_object()
        self._assert_log_owner_for_student(request.user, log)

        scheduled_submission_at = request.data.get('scheduled_submission_at')
        if not scheduled_submission_at:
            return Response(
                {'error': 'Please provide a scheduled_submission_at value.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            scheduled_submission_at = datetime.fromisoformat(scheduled_submission_at)
        except ValueError:
            return Response(
                {'error': 'scheduled_submission_at must be a valid ISO datetime.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if timezone.is_naive(scheduled_submission_at):
            scheduled_submission_at = timezone.make_aware(scheduled_submission_at, timezone.get_current_timezone())

        if scheduled_submission_at <= timezone.now():
            return Response(
                {'error': 'scheduled_submission_at must be in the future.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        self._schedule_log(log, scheduled_submission_at, request.user)
        return Response(
            {
                'message': 'Log scheduled for submission.',
                'scheduled_submission_at': scheduled_submission_at,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        log = self.get_object()
        supervisor = self._assert_supervisor_can_review_log(request.user, log)

        if supervisor:
            payload = self._build_review_payload(request, 'Approved by supervisor.', 'approved')
            self._upsert_log_review(log, supervisor, payload)

        self._update_log_status_with_history(log, 'approved', request.user)
        return Response({'message': 'Weekly log approved.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        log = self.get_object()
        supervisor = self._assert_supervisor_can_review_log(request.user, log)

        if supervisor:
            payload = self._build_review_payload(request, 'Rejected by supervisor.', 'rejected')
            self._upsert_log_review(log, supervisor, payload)

        self._update_log_status_with_history(log, 'rejected', request.user)
        return Response({'message': 'Weekly log rejected.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='request-revision')
    def request_revision(self, request, pk=None):
        log = self.get_object()
        supervisor = self._assert_supervisor_can_review_log(request.user, log)

        if supervisor:
            payload = self._build_review_payload(request, 'Changes requested by supervisor.', 'needs_revision')
            self._upsert_log_review(log, supervisor, payload)

        self._update_log_status_with_history(log, 'reviewed', request.user)
        return Response({'message': 'Revision requested for this weekly log.'}, status=status.HTTP_200_OK)


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

        # Optimize queries with select_related and prefetch_related
        queryset = self.queryset.select_related(
            'log__placement__student__user__role',
            'log__placement__organization',
            'log__placement__workplace_supervisor__user__role',
            'log__placement__academic_supervisor__user__role'
        ).prefetch_related(
            Prefetch('log__placement__student__user__settings'),
            Prefetch('log__placement__workplace_supervisor__user__settings'),
            Prefetch('log__placement__academic_supervisor__user__settings')
        )

        if role_name == 'admin':
            return queryset

        if 'student' in role_name:
            return queryset.filter(log__placement__student__user=user)

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return queryset
            return LogAttachment.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return queryset.filter(log__placement__workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return queryset.filter(log__placement__student__user__department=supervisor.department)
            return queryset.filter(log__placement__academic_supervisor=supervisor)

        return LogAttachment.objects.none()


class FinalReportViewSet(viewsets.ModelViewSet):
    queryset = FinalReport.objects.all()
    serializer_class = FinalReportSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _role_name(self, user):
        return (user.role.role_name if user.role else '').strip().lower()

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return FinalReport.objects.none()

        role_name = self._role_name(user)

        # Optimize queries with select_related and prefetch_related
        queryset = self.queryset.select_related(
            'placement__student__user__role',
            'placement__organization',
            'placement__workplace_supervisor__user__role',
            'placement__academic_supervisor__user__role'
        ).prefetch_related(
            Prefetch('placement__student__user__settings'),
            Prefetch('placement__workplace_supervisor__user__settings'),
            Prefetch('placement__academic_supervisor__user__settings')
        )

        if role_name == 'admin':
            return queryset

        if 'student' in role_name:
            return queryset.filter(placement__student__user=user)

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return queryset
            return FinalReport.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return queryset.filter(placement__workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            return queryset.filter(placement__academic_supervisor=supervisor)

        return FinalReport.objects.none()

    def perform_create(self, serializer):
        # Allow student to upload their own final report
        user = self.request.user
        role_name = self._role_name(user)

        if 'student' not in role_name and role_name != 'admin':
            raise PermissionDenied('Only students can upload final reports.')

        placement_id = self.request.data.get('placement')
        if not placement_id:
            raise PermissionDenied('Placement ID is required.')

        # Ensure placement belongs to student if not admin
        if role_name != 'admin':
            from placements.models import InternshipPlacement
            try:
                # placement_id might be a UUID string
                placement = InternshipPlacement.objects.get(placement_id=placement_id, student__user=user)
            except InternshipPlacement.DoesNotExist:
                raise PermissionDenied('You can only upload a report for your own placement.')

        serializer.save()
