from rest_framework import serializers
from .models import InternshipPlacement, PlacementDocument
from accounts.serializers import StudentSerializer, SupervisorSerializer
from organizations.serializers import OrganizationSerializer


class PlacementDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementDocument
        fields = '__all__'


class InternshipPlacementSerializer(serializers.ModelSerializer):
    student_details = StudentSerializer(source='student', read_only=True)
    organization_details = OrganizationSerializer(source='organization', read_only=True)
    workplace_supervisor_details = SupervisorSerializer(source='workplace_supervisor', read_only=True)
    academic_supervisor_details = SupervisorSerializer(source='academic_supervisor', read_only=True)
    documents = PlacementDocumentSerializer(source='placementdocument_set', many=True, read_only=True)

    class Meta:
        model = InternshipPlacement
        fields = '__all__'