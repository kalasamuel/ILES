from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Role, Department, User, Student, Supervisor, UserSettings
from .serializers import RoleSerializer, DepartmentSerializer, UserSerializer, UserRegisterSerializer, StudentSerializer, SupervisorSerializer, UserSettingsSerializer
from datetime import timedelta
from django.utils import timezone
import uuid
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from django.core.cache import cache


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

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        _ensure_role_profile(request.user)
        if request.method.lower() == 'patch':
            update_data = {}
            for field in ['first_name', 'last_name', 'email', 'phone_number']:
                if field in request.data:
                    update_data[field] = request.data.get(field)

            if 'department_id' in request.data:
                update_data['department_id'] = request.data.get('department_id') or None

            serializer = self.get_serializer(request.user, data=update_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch'], url_path='me/settings')
    def me_settings(self, request):
        _ensure_role_profile(request.user)
        settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)

        if request.method.lower() == 'patch':
            serializer = UserSettingsSerializer(settings_obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = UserSettingsSerializer(settings_obj)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='me/change-password')
    def me_change_password(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            return Response({'error': 'All password fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)

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

    
    @action(detail=False, methods=['post'], permission_classes=[], url_path='forgot-password')
    def forgot_password(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
        
            return Response({'message': 'If that email is registered, a reset link has been sent.'})
        token = get_random_string(64)
        cache_key = f'password_reset_{token}'
        cache.set(cache_key, user.user_id, timeout=3600)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f'{frontend_url}/reset-password?token={token}'

        send_mail(
            subject='Reset Your ILES Password',
            message=(
                f'Hi {user.first_name},\n\n'
                f'You requested a password reset for your ILES account.\n\n'
                f'Click the link below to reset your password (valid for 1 hour):\n\n'
                f'{reset_link}\n\n'
                f'If you did not request this, you can safely ignore this email.\n\n'
                f'— ILES Support Team'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response({'message': 'If that email is registered, a reset link has been sent.'})

    
    @action(detail=False, methods=['post'], permission_classes=[], url_path='reset-password')
    def reset_password(self, request):
        token = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not token or not new_password or not confirm_password:
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f'password_reset_{token}'
        user_id = cache.get(cache_key)

        if not user_id:
            return Response({'error': 'Reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        cache.delete(cache_key)  

        return Response({'message': 'Password reset successfully. You can now log in.'})


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