from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import LogReview, WorkflowHistory
from .serializers import LogReviewSerializer, WorkflowHistorySerializer


class LogReviewViewSet(viewsets.ModelViewSet):
    queryset = LogReview.objects.all()
    serializer_class = LogReviewSerializer
    permission_classes = [IsAuthenticated]

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
