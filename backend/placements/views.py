from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import InternshipPlacement, PlacementDocument
from .serializers import InternshipPlacementSerializer, PlacementDocumentSerializer
from reviews.models import WorkflowHistory
from accounts.models import Supervisor


class InternshipPlacementViewSet(viewsets.ModelViewSet):
    queryset = InternshipPlacement.objects.all()
    serializer_class = InternshipPlacementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return InternshipPlacement.objects.none()

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            return InternshipPlacement.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return self.queryset.filter(workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(student__user__department=supervisor.department)
            return self.queryset.filter(academic_supervisor=supervisor)

        return InternshipPlacement.objects.none()

    def perform_create(self, request):
        # Create workflow history
        placement = super().perform_create(request)
        WorkflowHistory.objects.create(
            entity_type='placement',
            entity_id=placement.placement_id,
            new_status=placement.status,
            changed_by=request.user
        )
        return placement

    def perform_update(self, request):
        old_status = self.get_object().status
        placement = super().perform_update(request)
        if old_status != placement.status:
            WorkflowHistory.objects.create(
                entity_type='placement',
                entity_id=placement.placement_id,
                previous_status=old_status,
                new_status=placement.status,
                changed_by=request.user
            )
        return placement

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        placement = self.get_object()
        if placement.status == 'pending':
            placement.status = 'approved'
            placement.save()
            WorkflowHistory.objects.create(
                entity_type='placement',
                entity_id=placement.placement_id,
                previous_status='pending',
                new_status='approved',
                changed_by=request.user
            )
            return Response({'message': 'Placement approved'})
        return Response({'error': 'Cannot approve this placement'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        placement = self.get_object()
        if placement.status == 'pending':
            placement.status = 'rejected'
            placement.save()
            WorkflowHistory.objects.create(
                entity_type='placement',
                entity_id=placement.placement_id,
                previous_status='pending',
                new_status='rejected',
                changed_by=request.user
            )
            return Response({'message': 'Placement rejected'})
        return Response({'error': 'Cannot reject this placement'}, status=status.HTTP_400_BAD_REQUEST)


class PlacementDocumentViewSet(viewsets.ModelViewSet):
    queryset = PlacementDocument.objects.all()
    serializer_class = PlacementDocumentSerializer
    permission_classes = [IsAuthenticated]
