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
    role = RoleSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['user_id', 'first_name', 'last_name', 'email', 'phone_number', 'role', 'department', 'is_active', 'date_joined', 'last_login']
        extra_kwargs = {
            'password': {'write_only': True}
        }


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    role = serializers.CharField(write_only=True, required=True)  # Accept role name as string

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'password', 'role']

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