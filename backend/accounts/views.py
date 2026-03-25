from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Role, Department, User, Student, Supervisor
from .serializers import RoleSerializer, DepartmentSerializer, UserSerializer, UserRegisterSerializer, StudentSerializer, SupervisorSerializer
from datetime import timedelta
from django.utils import timezone
import uuid


def _generate_registration_number():
    while True:
        value = f"TEMP-{uuid.uuid4().hex[:8].upper()}"
        if not Student.objects.filter(registration_number=value).exists():
            return value


def _ensure_role_profile(user):
    role_name = (user.role.role_name if user.role else '').strip().lower().replace('-', ' ').replace('_', ' ')

    if 'student' in role_name:
        Student.objects.get_or_create(
            user=user,
            defaults={
                'registration_number': _generate_registration_number(),
                'program': 'Not Set',
                'year_of_study': 1,
                'expected_graduation': timezone.now().date() + timedelta(days=365 * 4),
            }
        )
        return

    if 'supervisor' in role_name or 'academic' in role_name or 'workplace' in role_name:
        supervisor_type = 'academic' if 'academic' in role_name else 'workplace'
        Supervisor.objects.get_or_create(
            user=user,
            defaults={
                'supervisor_type': supervisor_type,
            }
        )


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role and user.role.role_name.lower() == 'admin':
            return self.queryset
        return self.queryset.filter(user_id=user.user_id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        _ensure_role_profile(request.user)
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, username=email, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'], permission_classes=[])
    def register(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role_name = (user.role.role_name if user.role else '').strip().lower()

        if role_name == 'admin':
            return self.queryset

        try:
            student = Student.objects.get(user=user)
            return self.queryset.filter(student_id=student.student_id)
        except Student.DoesNotExist:
            pass

        try:
            supervisor = Supervisor.objects.get(user=user)
        except Supervisor.DoesNotExist:
            if 'supervisor' in role_name:
                return self.queryset
            return Student.objects.none()

        if supervisor.supervisor_type == 'workplace':
            return self.queryset.filter(internshipplacement__workplace_supervisor=supervisor).distinct()

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(user__department=supervisor.department)
            return self.queryset.filter(internshipplacement__academic_supervisor=supervisor).distinct()

        return Student.objects.none()


class SupervisorViewSet(viewsets.ModelViewSet):
    queryset = Supervisor.objects.all()
    serializer_class = SupervisorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role and user.role.role_name.lower() == 'admin':
            return self.queryset

        try:
            supervisor = Supervisor.objects.get(user=user)
            return self.queryset.filter(supervisor_id=supervisor.supervisor_id)
        except Supervisor.DoesNotExist:
            return Supervisor.objects.none()
