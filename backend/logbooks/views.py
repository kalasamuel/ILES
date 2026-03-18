from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import WeeklyLog, LogAttachment
from .serializers import WeeklyLogSerializer, LogAttachmentSerializer
from reviews.models import WorkflowHistory


class WeeklyLogViewSet(viewsets.ModelViewSet):
    queryset = WeeklyLog.objects.all()
    serializer_class = WeeklyLogSerializer
    permission_classes = [IsAuthenticated]

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
