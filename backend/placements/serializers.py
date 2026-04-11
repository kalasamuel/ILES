from rest_framework import serializers
from .models import InternshipPlacement, PlacementDocument
from accounts.serializers import StudentSerializer, SupervisorSerializer
from accounts.models import Student, Supervisor
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

    def validate(self, attrs):
        request = self.context.get('request')

        # For create requests, infer missing required relations from the logged-in user context.
        if self.instance is None and request and request.user and request.user.is_authenticated:
            student = attrs.get('student')
            if student is None:
                try:
                    student = Student.objects.get(user=request.user)
                    attrs['student'] = student
                except Student.DoesNotExist:
                    raise serializers.ValidationError({
                        'student': 'Student profile not found for the current user.'
                    })

            organization = attrs.get('organization')

            workplace_supervisor = attrs.get('workplace_supervisor')
            if workplace_supervisor is None and organization is not None:
                workplace_supervisor = (
                    Supervisor.objects
                    .filter(supervisor_type='workplace', organization=organization)
                    .order_by('user__first_name', 'user__last_name')
                    .first()
                )
                if workplace_supervisor is None:
                    raise serializers.ValidationError({
                        'workplace_supervisor': 'No workplace supervisor is assigned to the selected organization.'
                    })
                attrs['workplace_supervisor'] = workplace_supervisor

            academic_supervisor = attrs.get('academic_supervisor')
            if academic_supervisor is None and student is not None:
                department = student.user.department
                academic_qs = Supervisor.objects.filter(supervisor_type='academic')
                if department is not None:
                    academic_qs = academic_qs.filter(department=department)

                academic_supervisor = academic_qs.order_by('user__first_name', 'user__last_name').first()
                if academic_supervisor is None:
                    raise serializers.ValidationError({
                        'academic_supervisor': 'No academic supervisor is available for this student.'
                    })
                attrs['academic_supervisor'] = academic_supervisor

        workplace_supervisor = attrs.get('workplace_supervisor')
        if workplace_supervisor is not None and workplace_supervisor.supervisor_type != 'workplace':
            raise serializers.ValidationError({
                'workplace_supervisor': 'Selected supervisor must be of type workplace.'
            })

        academic_supervisor = attrs.get('academic_supervisor')
        if academic_supervisor is not None and academic_supervisor.supervisor_type != 'academic':
            raise serializers.ValidationError({
                'academic_supervisor': 'Selected supervisor must be of type academic.'
            })

        return attrs