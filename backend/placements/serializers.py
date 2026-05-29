from rest_framework import serializers
from .models import InternshipPlacement, PlacementDocument
from accounts.serializers import StudentSerializer, SupervisorSerializer
from accounts.models import Student, Supervisor
from organizations.serializers import OrganizationSerializer
from .utils import finalize_placement_submission, resolve_workplace_supervisor


LOCKED_PLACEMENT_MESSAGE = 'This placement is locked. Delete the uploaded acceptance letter to edit it again.'


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
    acceptance_letter = serializers.FileField(write_only=True, required=False, allow_null=True)
    workplace_supervisor_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    is_editable = serializers.SerializerMethodField(read_only=True)
    has_acceptance_letter = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = InternshipPlacement
        fields = '__all__'
        extra_kwargs = {
            'student': {'required': False},
            'workplace_supervisor': {'required': False},
            'academic_supervisor': {'required': False},
        }

    def get_is_editable(self, obj):
        return not (obj.is_submitted and obj.placementdocument_set.filter(document_type='acceptance_letter').exists())

    def get_has_acceptance_letter(self, obj):
        return obj.placementdocument_set.filter(document_type='acceptance_letter').exists()

    def validate(self, attrs):
        request = self.context.get('request')

        if self.instance is not None and request and request.user and request.user.is_authenticated:
            role_name = (request.user.role.role_name if request.user.role else '').strip().lower()
            locked = self.instance.is_submitted and self.instance.placementdocument_set.filter(document_type='acceptance_letter').exists()
            if 'student' in role_name and locked:
                raise serializers.ValidationError({'acceptance_letter': LOCKED_PLACEMENT_MESSAGE})

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
            supervisor_email = (attrs.get('workplace_supervisor_email', '') or '').strip()

            workplace_supervisor = attrs.get('workplace_supervisor')
            if workplace_supervisor is None:
                if supervisor_email:
                    workplace_supervisor = resolve_workplace_supervisor(supervisor_email, organization=organization)
                elif organization is not None:
                    workplace_supervisor = (
                        Supervisor.objects
                        .filter(supervisor_type='workplace', organization=organization)
                        .order_by('user__first_name', 'user__last_name')
                        .first()
                    )
                    if workplace_supervisor is None:
                        workplace_supervisor = (
                            Supervisor.objects
                            .filter(supervisor_type='workplace')
                            .order_by('user__first_name', 'user__last_name')
                            .first()
                        )
                if workplace_supervisor is None:
                    raise serializers.ValidationError({
                        'workplace_supervisor_email': 'A workplace supervisor email is required.'
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

    def create(self, validated_data):
        acceptance_letter = validated_data.pop('acceptance_letter', None)
        workplace_supervisor_email = (validated_data.get('workplace_supervisor_email', '') or '').strip()

        if workplace_supervisor_email and not validated_data.get('workplace_supervisor'):
            validated_data['workplace_supervisor'] = resolve_workplace_supervisor(
                workplace_supervisor_email,
                organization=validated_data.get('organization'),
            )

        placement = InternshipPlacement.objects.create(**validated_data)

        if acceptance_letter:
            PlacementDocument.objects.create(
                placement=placement,
                document_type='acceptance_letter',
                file_url=acceptance_letter,
            )
            finalize_placement_submission(placement, document_name=getattr(acceptance_letter, 'name', None))

        return placement

    def update(self, instance, validated_data):
        acceptance_letter = validated_data.pop('acceptance_letter', None)
        workplace_supervisor_email = (validated_data.get('workplace_supervisor_email', '') or '').strip()

        if workplace_supervisor_email:
            validated_data['workplace_supervisor'] = resolve_workplace_supervisor(
                workplace_supervisor_email,
                organization=validated_data.get('organization', instance.organization),
            )

        placement = super().update(instance, validated_data)

        if acceptance_letter:
            placement.placementdocument_set.filter(document_type='acceptance_letter').delete()
            PlacementDocument.objects.create(
                placement=placement,
                document_type='acceptance_letter',
                file_url=acceptance_letter,
            )
            finalize_placement_submission(placement, document_name=getattr(acceptance_letter, 'name', None))

        return placement