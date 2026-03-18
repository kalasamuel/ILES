from rest_framework import serializers
from .models import Role, Department, User, Student, Supervisor


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    department_name = serializers.CharField(source='department.department_name', read_only=True)

    class Meta:
        model = User
        fields = ['user_id', 'first_name', 'last_name', 'email', 'phone_number', 'role', 'role_name', 'department', 'department_name', 'is_active', 'date_joined', 'last_login']
        extra_kwargs = {
            'password_hash': {'write_only': True}
        }


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