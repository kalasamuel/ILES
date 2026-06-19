from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Prefetch
from .models import InternshipPlacement, PlacementDocument
from .serializers import InternshipPlacementSerializer, PlacementDocumentSerializer
from .utils import finalize_placement_submission, unlock_placement_submission
from reviews.models import WorkflowHistory
from accounts.models import Supervisor, UserSettings


class InternshipPlacementViewSet(viewsets.ModelViewSet):
    queryset = InternshipPlacement.objects.all()
    serializer_class = InternshipPlacementSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Use simplified serializer for list/admin views, full details for retrieve/create/update"""
        if self.action in ['list']:
            from .serializers import SimplePlacementSerializer
            return SimplePlacementSerializer
        return InternshipPlacementSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return InternshipPlacement.objects.none()

        role_name = (user.role.role_name if user.role else '').strip().lower()

        # Optimize queries with select_related and prefetch_related
        queryset = self.queryset.select_related(
            'student__user__role',
            'student__user__department',
            'organization',
            'workplace_supervisor__user__role',
            'workplace_supervisor__organization',
            'academic_supervisor__user__role',
            'academic_supervisor__user__department'
        ).prefetch_related(
            Prefetch('student__user__settings'),
            Prefetch('workplace_supervisor__user__settings'),
            Prefetch('academic_supervisor__user__settings'),
            Prefetch('placementdocument_set')
        )

        if role_name == 'admin':
            return queryset

        if 'student' in role_name:
            return queryset.filter(student__user=user)

        # Check if user is a Supervisor
        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return queryset
            return InternshipPlacement.objects.none()

        if supervisor.supervisor_type == 'workplace':
            if supervisor.organization_id:
                return queryset.filter(
                    Q(workplace_supervisor=supervisor) | Q(organization=supervisor.organization)
                ).distinct()
            return queryset.filter(workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return queryset.filter(student__user__department=supervisor.department)
            return queryset.filter(academic_supervisor=supervisor)

        return InternshipPlacement.objects.none()

    def perform_create(self, serializer):
        # Create workflow history after persistence.
        placement = serializer.save()
        WorkflowHistory.objects.create(
            entity_type='placement',
            entity_id=placement.placement_id,
            new_status=placement.status,
            changed_by=self.request.user
        )
        if placement.is_submitted and not placement.placementdocument_set.filter(document_type='acceptance_letter').exists():
            finalize_placement_submission(placement)

    def perform_update(self, serializer):
        old_status = self.get_object().status
        placement = serializer.save()
        if old_status != placement.status:
            WorkflowHistory.objects.create(
                entity_type='placement',
                entity_id=placement.placement_id,
                previous_status=old_status,
                new_status=placement.status,
                changed_by=self.request.user
            )

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

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return PlacementDocument.objects.none()

        role_name = (user.role.role_name if user.role else '').strip().lower()

        # Optimize queries with select_related
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
            return PlacementDocument.objects.none()

        if supervisor.supervisor_type == 'workplace':
            if supervisor.organization_id:
                return queryset.filter(
                    Q(placement__workplace_supervisor=supervisor) | Q(placement__organization=supervisor.organization)
                ).distinct()
            return queryset.filter(placement__workplace_supervisor=supervisor)

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return queryset.filter(placement__student__user__department=supervisor.department)
            return queryset.filter(placement__academic_supervisor=supervisor)

        return PlacementDocument.objects.none()

    def perform_create(self, serializer):
        document = serializer.save()
        if document.document_type == 'acceptance_letter' and not document.placement.is_submitted:
            finalize_placement_submission(document.placement, document_name=document.file_url.name)

    def perform_destroy(self, instance):
        placement = instance.placement
        super().perform_destroy(instance)
        has_acceptance_letter = placement.placementdocument_set.filter(document_type='acceptance_letter').exists()
        if not has_acceptance_letter and placement.is_submitted:
            unlock_placement_submission(placement)
