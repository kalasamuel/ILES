from rest_framework import serializers
from .models import Role, Department, User, Student, Supervisor
from datetime import timedelta
from django.utils import timezone
import uuid


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
    role_id = serializers.PrimaryKeyRelatedField(source='role', queryset=Role.objects.all(), write_only=True, required=False)
    department_id = serializers.PrimaryKeyRelatedField(source='department', queryset=Department.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['user_id', 'first_name', 'last_name', 'email', 'phone_number', 'role', 'department', 'role_id', 'department_id', 'is_active', 'date_joined', 'last_login']
        extra_kwargs = {
            'password': {'write_only': True}
        }


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    role = serializers.CharField(write_only=True, required=True)  # Accept role name as string

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'password', 'role']

    def _generate_registration_number(self):
        while True:
            value = f"TEMP-{uuid.uuid4().hex[:8].upper()}"
            if not Student.objects.filter(registration_number=value).exists():
                return value

    def _ensure_role_profile(self, user, role_name):
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
            Supervisor.objects.get_or_create(
                user=user,
                defaults={
                    'supervisor_type': supervisor_type,
                }
            )

    def create(self, validated_data):
        role_name = validated_data.pop('role')
        password = validated_data.pop('password')

        # Get or create the role
        role, created = Role.objects.get_or_create(role_name=role_name)

        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            role=role,
            **{k: v for k, v in validated_data.items() if k != 'email'}
        )

        self._ensure_role_profile(user, role_name)
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