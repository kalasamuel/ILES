from rest_framework import serializers
from .models import Role, Department, User, Student, Supervisor, UserSettings
from datetime import timedelta
from django.utils import timezone
import uuid
from organizations.models import Organization


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    profile_picture = serializers.FileField(required=False, allow_null=True, write_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    role_id = serializers.PrimaryKeyRelatedField(source='role', queryset=Role.objects.all(), write_only=True, required=False)
    department_id = serializers.PrimaryKeyRelatedField(source='department', queryset=Department.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['user_id', 'first_name', 'last_name', 'email', 'phone_number', 'profile_picture', 'profile_picture_url', 'role', 'department', 'role_id', 'department_id', 'is_active', 'date_joined', 'last_login']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_profile_picture_url(self, obj):
        if not obj.profile_picture:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.profile_picture.url)
        return obj.profile_picture.url

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        department = validated_data.pop('department', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if role is not None:
            instance.role = role

        if department is not None:
            instance.department = department

        instance.save()
        return instance


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    role = serializers.CharField(write_only=True, required=True)  # Accept role name as string
    organization_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    organization_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'password', 'role', 'organization_id', 'organization_name']

    def _generate_registration_number(self):
        while True:
            value = f"TEMP-{uuid.uuid4().hex[:8].upper()}"
            if not Student.objects.filter(registration_number=value).exists():
                return value

    def _ensure_role_profile(self, user, role_name, organization=None):
        normalized = role_name.strip().lower().replace('-', ' ').replace('_', ' ')

        if 'student' in normalized:
            Student.objects.get_or_create(
                user=user,
                defaults={
                    'registration_number': self._generate_registration_number(),
                    'program': 'Not Set',
                    'year_of_study': 1,
                    'expected_graduation': timezone.now().date() + timedelta(days=365 * 4),
                }
            )
            return

        if 'supervisor' in normalized or 'academic' in normalized or 'workplace' in normalized:
            supervisor_type = 'academic' if 'academic' in normalized else 'workplace'
            supervisor, _ = Supervisor.objects.get_or_create(
                user=user,
                defaults={
                    'supervisor_type': supervisor_type,
                    'organization': organization if supervisor_type == 'workplace' else None,
                }
            )
            if supervisor_type == 'workplace' and organization and supervisor.organization_id != organization.organization_id:
                supervisor.organization = organization
                supervisor.save(update_fields=['organization'])

    def _resolve_workplace_organization(self, organization_id, organization_name):
        if organization_id:
            try:
                return Organization.objects.get(organization_id=organization_id)
            except Organization.DoesNotExist:
                raise serializers.ValidationError({'organization_id': 'Selected organization does not exist.'})

        cleaned_name = (organization_name or '').strip()
        if not cleaned_name:
            raise serializers.ValidationError({'organization_name': 'Organization name is required for workplace supervisors.'})

        existing = Organization.objects.filter(name__iexact=cleaned_name).first()
        if existing:
            return existing

        # Allow creating new organizations inline during registration.
        return Organization.objects.create(
            name=cleaned_name,
            industry='Not specified',
            address='Not provided',
            city='Not provided',
            country='Not provided',
            contact_email='no-reply@iles.local',
            contact_phone='0000000000',
        )

    def create(self, validated_data):
        role_name = validated_data.pop('role')
        password = validated_data.pop('password')
        organization_id = validated_data.pop('organization_id', None)
        organization_name = validated_data.pop('organization_name', '')

        # Get or create the role
        role, created = Role.objects.get_or_create(role_name=role_name)

        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            role=role,
            **{k: v for k, v in validated_data.items() if k != 'email'}
        )

        normalized = role_name.strip().lower().replace('-', ' ').replace('_', ' ')
        workplace_org = None
        if 'workplace' in normalized:
            workplace_org = self._resolve_workplace_organization(organization_id, organization_name)

        self._ensure_role_profile(user, role_name, organization=workplace_org)
        return user


class StudentSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'


class SupervisorSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    department_name = serializers.CharField(source='department.department_name', read_only=True)

    class Meta:
        model = Supervisor
        fields = '__all__'


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = [
            'settings_id',
            'email_notifications',
            'push_notifications',
            'log_reminders',
            'review_alerts',
            'weekly_summary',
            'profile_visible',
            'show_email',
            'show_phone',
        ]
        read_only_fields = ['settings_id']