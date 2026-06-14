from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Role, Department, User, Student, Supervisor, UserSettings
from .serializers import RoleSerializer, DepartmentSerializer, UserSerializer, UserRegisterSerializer, StudentSerializer, SupervisorSerializer, UserSettingsSerializer
from datetime import timedelta
import logging
from django.utils import timezone
import uuid
import re
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from django.core.cache import cache
from django.db import transaction
from organizations.models import Organization
from notifications.models import Notification, LoginHistory
from notifications.utils import extract_device_info, get_location_from_ip, get_client_ip


logger = logging.getLogger(__name__)


def _send_login_alert_email(user, device_info, location_info):
    recipient = (user.email or '').strip()
    if not recipient:
        return

    sender = settings.EMAIL_HOST_USER or settings.DEFAULT_FROM_EMAIL
    subject = 'New ILES Login Alert'
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    notifications_url = f'{frontend_url}/app/notifications'
    message = (
        f'Hello {user.first_name},\n\n'
        'A new sign-in to your ILES account was detected.\n\n'
        f"Device: {device_info['device_name']}\n"
        f"Browser: {device_info['browser']}\n"
        f"Operating system: {device_info['operating_system']}\n"
        f"Location: {location_info['location']}\n"
        f"IP address: {location_info.get('ip_address') or 'Unknown'}\n\n"
        f'View your notifications here: {notifications_url}\n\n'
        'If this was not you, please change your password immediately.\n\n'
        '— ILES Support Team'
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=sender,
            recipient_list=[recipient],
            fail_silently=False,
        )
    except Exception:
        logger.exception('Failed to send login alert email to %s for user %s', recipient, user.user_id)


def _is_rate_limited(key, limit, ttl_seconds):
    current = cache.get(key)
    if current is None:
        cache.set(key, 1, timeout=ttl_seconds)
        return False

    if int(current) >= int(limit):
        return True

    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, int(current) + 1, timeout=ttl_seconds)

    return False


def _as_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def _institution_verification_cache_key(email):
    return f"institution_verification:{(email or '').strip().lower()}"


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
    def get_permissions(self):
        if self.action == 'list':
            return [AllowAny()]
        return [IsAuthenticated()]


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
            for field in ['first_name', 'last_name', 'phone_number', 'institution_name']:
                if field in request.data:
                    value = request.data.get(field)
                    if isinstance(value, str):
                        value = value.strip()
                    update_data[field] = value

            if 'first_name' in update_data and not update_data['first_name']:
                return Response({'error': 'First name cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

            if 'last_name' in update_data and not update_data['last_name']:
                return Response({'error': 'Last name cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

            if 'phone_number' in update_data and update_data['phone_number']:
                phone_number = update_data['phone_number']
                if not re.fullmatch(r'^\+?[0-9\s\-]{7,20}$', phone_number):
                    return Response({'error': 'Phone number format is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

            if 'email' in request.data:
                email = (request.data.get('email') or '').strip().lower()
                if not email:
                    return Response({'error': 'Email cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

                email_exists = User.objects.filter(email__iexact=email).exclude(user_id=request.user.user_id).exists()
                if email_exists:
                    return Response({'error': 'That email is already in use.'}, status=status.HTTP_400_BAD_REQUEST)
                update_data['email'] = email

            if 'department_id' in request.data:
                update_data['department_id'] = request.data.get('department_id') or None

            if 'profile_picture' in request.FILES:
                update_data['profile_picture'] = request.FILES.get('profile_picture')

            if _as_bool(request.data.get('remove_profile_picture', False)):
                update_data['profile_picture'] = None

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

        try:
            validate_password(new_password, request.user)
        except ValidationError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, username=email, password=password)
        if user:
            # Extract device and location information
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            ip_address = get_client_ip(request)
            device_info = extract_device_info(user_agent)
            location_info = get_location_from_ip(ip_address)
            
            try:
                with transaction.atomic():
                    LoginHistory.objects.create(
                        user=user,
                        ip_address=ip_address,
                        device_name=device_info['device_name'],
                        device_type=device_info['device_type'],
                        browser=device_info['browser'],
                        operating_system=device_info['operating_system'],
                        location=location_info['location'],
                        country=location_info['country'],
                        city=location_info['city'],
                        latitude=location_info['latitude'],
                        longitude=location_info['longitude'],
                        user_agent=user_agent,
                    )
            except Exception:
                logger.exception('Failed to record login history for user %s', user.user_id)

            try:
                notification_message = f"New login detected on {device_info['device_name']} from {location_info['location']}"
                Notification.objects.create(
                    user=user,
                    notification_type='login_alert',
                    message=notification_message,
                    details={
                        'device_name': device_info['device_name'],
                        'device_type': device_info['device_type'],
                        'browser': device_info['browser'],
                        'operating_system': device_info['operating_system'],
                        'location': location_info['location'],
                        'country': location_info['country'],
                        'city': location_info['city'],
                        'ip_address': ip_address,
                    }
                )
                _send_login_alert_email(
                    user,
                    device_info,
                    {**location_info, 'ip_address': ip_address},
                )
            except Exception:
                logger.exception('Failed to create login alert notification for user %s', user.user_id)
            
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'], permission_classes=[])
    def register(self, request):
        # Basic IP-based throttle for unauthenticated registration attempts.
        ip = get_client_ip(request)
        register_key = f"rate_limit:register:{ip}"
        if _is_rate_limited(register_key, limit=10, ttl_seconds=60):
            return Response(
                {'error': 'Too many registration attempts. Please wait a minute and try again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

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

    @action(detail=False, methods=['post'], permission_classes=[], url_path='send-institution-verification-code')
    def send_institution_verification_code(self, request):
        institution_email = (request.data.get('institution_email') or '').strip().lower()

        if not institution_email:
            return Response({'error': 'Institution email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        ip = get_client_ip(request)
        throttle_key = f"rate_limit:institution_verify:{ip}"
        if _is_rate_limited(throttle_key, limit=5, ttl_seconds=60):
            return Response(
                {'error': 'Too many verification requests. Please wait and try again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        verification_code = get_random_string(6, allowed_chars='0123456789')
        cache_key = _institution_verification_cache_key(institution_email)
        cache.set(cache_key, verification_code, timeout=600)

        try:
            send_mail(
                subject='Your ILES Institution Verification Code',
                message=(
                    'Hello,\n\n'
                    'A registration on ILES requires verification of this institution email address.\n\n'
                    f'Your verification code is: {verification_code}\n\n'
                    'This code expires in 10 minutes.\n\n'
                    'If you did not request this code, you can ignore this message.\n\n'
                    '— ILES Support Team'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[institution_email],
                fail_silently=False,
            )
        except Exception as e:
            logger.exception('SMTP Error for %s', institution_email)
            return Response(
                {'error': f'Failed to send email. SMTP Error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({'message': 'Verification code sent to institution email.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[], url_path='verify-institution-verification-code')
    def verify_institution_verification_code(self, request):
        institution_email = (request.data.get('institution_email') or '').strip().lower()
        verification_code = (request.data.get('institution_verification_code') or '').strip()

        if not institution_email:
            return Response({'error': 'Institution email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not verification_code:
            return Response({'error': 'Institution verification code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = _institution_verification_cache_key(institution_email)
        expected_code = cache.get(cache_key)
        if not expected_code or str(expected_code).strip() != verification_code:
            return Response({'error': 'Institution verification code is invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'verified': True, 'message': 'Institution email verified.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[], url_path='organization-suggestions')
    def organization_suggestions(self, request):
        """Public search endpoint used by registration typeahead for workplace organizations."""
        query = (request.query_params.get('q') or '').strip()

        # Do not return broad lists for tiny/empty queries.
        if len(query) < 2:
            return Response({'results': []})

        # IP-based throttle to reduce organization enumeration risk.
        ip = get_client_ip(request)
        lookup_key = f"rate_limit:org_lookup:{ip}"
        if _is_rate_limited(lookup_key, limit=60, ttl_seconds=60):
            return Response(
                {'error': 'Too many organization lookups. Please wait and try again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        queryset = Organization.objects.all()
        queryset = queryset.filter(name__icontains=query)

        results = queryset.order_by('name').values('organization_id', 'name')[:10]
        return Response({'results': list(results)})

    @action(detail=False, methods=['get'], permission_classes=[], url_path='course-suggestions')
    def course_suggestions(self, request):
        """Public search endpoint used by registration typeahead for student courses."""
        query = (request.query_params.get('q') or '').strip()

        if len(query) < 2:
            return Response({'results': []})

        ip = get_client_ip(request)
        lookup_key = f"rate_limit:course_lookup:{ip}"
        if _is_rate_limited(lookup_key, limit=60, ttl_seconds=60):
            return Response(
                {'error': 'Too many course lookups. Please wait and try again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        results = (
            Student.objects
            .exclude(program__isnull=True)
            .exclude(program__exact='')
            .filter(program__icontains=query)
            .order_by('program')
            .values_list('program', flat=True)
            .distinct()[:10]
        )

        return Response({'results': [{'name': program} for program in results]})

    
    @action(detail=False, methods=['post'], permission_classes=[], url_path='forgot-password')
    def forgot_password(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'message': 'If that email is registered, a verification code has been sent.'})

        verification_code = None
        cache_key = None
        while True:
            verification_code = get_random_string(6, allowed_chars='0123456789')
            cache_key = f'password_reset_{verification_code}'
            if cache.get(cache_key) is None:
                break

        cache.set(cache_key, user.user_id, timeout=3600)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_page = f'{frontend_url}/reset-password'

        send_mail(
            subject='Your ILES Password Verification Code',
            message=(
                f'Hi {user.first_name},\n\n'
                f'You requested a password reset for your ILES account.\n\n'
                f'Use this verification code to reset your password (valid for 1 hour):\n\n'
                f'{verification_code}\n\n'
                f'Open the password reset page here:\n\n'
                f'{reset_page}\n\n'
                f'If you did not request this, you can safely ignore this email.\n\n'
                f'— ILES Support Team'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response({'message': 'If that email is registered, a verification code has been sent.'})

    
    @action(detail=False, methods=['post'], permission_classes=[], url_path='reset-password')
    def reset_password(self, request):
        verification_code = request.data.get('verification_code', '').strip() or request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not verification_code or not new_password or not confirm_password:
            return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f'password_reset_{verification_code}'
        user_id = cache.get(cache_key)

        if not user_id:
            return Response({'error': 'Verification code is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

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
            if supervisor.organization_id:
                return self.queryset.filter(internshipplacement__organization=supervisor.organization).distinct()
            return self.queryset.filter(internshipplacement__workplace_supervisor=supervisor).distinct()

        if supervisor.supervisor_type == 'academic':
            if supervisor.department:
                return self.queryset.filter(user__department=supervisor.department)
            return self.queryset.filter(internshipplacement__academic_supervisor=supervisor).distinct()

        return Student.objects.none()

    @action(detail=False, methods=['post'], url_path='bulk-assign-supervisor')
    def bulk_assign_supervisor(self, request):
        """
        Bulk assign an academic supervisor to a list of students.
        Requires 'Admin' role.
        """
        user = request.user
        role_name = (user.role.role_name if user.role else '').strip().lower()

        if role_name != 'admin':
            return Response({'error': 'Only administrators can perform bulk assignments.'}, status=status.HTTP_403_FORBIDDEN)

        student_ids = request.data.get('student_ids', [])
        supervisor_id = request.data.get('supervisor_id')

        if not student_ids or not supervisor_id:
            return Response({'error': 'Both student_ids and supervisor_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            supervisor = Supervisor.objects.get(supervisor_id=supervisor_id, supervisor_type='academic')
        except Supervisor.DoesNotExist:
            return Response({'error': 'Academic supervisor not found.'}, status=status.HTTP_404_NOT_FOUND)

        students = Student.objects.filter(student_id__in=student_ids)
        updated_count = students.update(academic_supervisor=supervisor)

        # Update active placements for these students
        from placements.models import InternshipPlacement
        InternshipPlacement.objects.filter(
            student__in=students,
            status__in=['pending', 'approved']
        ).update(academic_supervisor=supervisor)

        return Response({
            'message': f'Successfully assigned supervisor to {updated_count} students.',
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)


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