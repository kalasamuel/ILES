from rest_framework import serializers
from PIL import Image, UnidentifiedImageError
from django.core.cache import cache
from .models import Role, Department, User, Student, Supervisor, UserSettings
from datetime import timedelta
from django.utils import timezone
import uuid
from organizations.models import Organization


MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024
MIN_PROFILE_IMAGE_DIMENSION = 64
MAX_PROFILE_IMAGE_DIMENSION = 4096


def _institution_verification_cache_key(email):
    return f"institution_verification:{(email or '').strip().lower()}"


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
    affiliation_type = serializers.SerializerMethodField()
    affiliation_name = serializers.SerializerMethodField()
    student_course = serializers.SerializerMethodField()
    profile_visible = serializers.SerializerMethodField()
    show_email = serializers.SerializerMethodField()
    role_id = serializers.PrimaryKeyRelatedField(source='role', queryset=Role.objects.all(), write_only=True, required=False)
    department_id = serializers.PrimaryKeyRelatedField(source='department', queryset=Department.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['user_id', 'first_name', 'last_name', 'email', 'phone_number', 'institution_name', 'institution_email', 'profile_picture', 'profile_picture_url', 'affiliation_type', 'affiliation_name', 'student_course', 'profile_visible', 'show_email', 'role', 'department', 'role_id', 'department_id', 'is_active', 'date_joined', 'last_login']
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

    def to_representation(self, instance):
        """
        Mask identifying fields when the target user has profile_visible=False
        and the requesting user is neither the target user nor an admin.
        """
        request = self.context.get('request')
        # Base representation
        data = super().to_representation(instance)

        try:
            settings_obj = UserSettings.objects.filter(user=instance).first()
        except Exception:
            settings_obj = None

        # If no request context, return as-is
        if not request or not hasattr(request, 'user') or request.user is None:
            return data

        requester = request.user
        is_admin = False
        try:
            is_admin = bool(requester.role and str(requester.role.role_name).strip().lower() == 'admin')
        except Exception:
            is_admin = False

        is_self = getattr(requester, 'user_id', None) and getattr(instance, 'user_id', None) and str(requester.user_id) == str(instance.user_id)

        if settings_obj and settings_obj.profile_visible is False and not is_admin and not is_self:
            # Mask identifying fields
            data['first_name'] = ''
            data['last_name'] = ''
            data['email'] = None
            data['phone_number'] = None
            data['institution_name'] = None
            data['profile_picture_url'] = None

        # Additionally respect the show_email flag even when profile_visible is True
        if settings_obj and settings_obj.show_email is False and not is_admin and not is_self:
            data['email'] = None

        return data

    def get_profile_visible(self, obj):
        try:
            settings_obj = UserSettings.objects.filter(user=obj).first()
            if settings_obj is None:
                return True
            return bool(settings_obj.profile_visible)
        except Exception:
            return True

    def get_show_email(self, obj):
        try:
            settings_obj = UserSettings.objects.filter(user=obj).first()
            if settings_obj is None:
                return True
            return bool(settings_obj.show_email)
        except Exception:
            return True

    def _role_slug(self, obj):
        return str(getattr(obj.role, 'role_name', '')).strip().lower().replace('-', ' ').replace('_', ' ')

    def get_affiliation_type(self, obj):
        role_slug = self._role_slug(obj)
        if 'workplace' in role_slug:
            return 'organization'
        if 'student' in role_slug or 'academic' in role_slug:
            return 'institution'
        return None

    def get_affiliation_name(self, obj):
        role_slug = self._role_slug(obj)

        if 'workplace' in role_slug:
            supervisor = getattr(obj, 'supervisor', None)
            if supervisor and supervisor.organization:
                return supervisor.organization.name
            return None

        if 'student' in role_slug or 'academic' in role_slug:
            return (obj.institution_name or '').strip() or None

        return None

    def get_student_course(self, obj):
        student = getattr(obj, 'student', None)
        if student and getattr(student, 'program', None):
            return student.program
        return None

    def validate_profile_picture(self, file_obj):
        if not file_obj:
            return file_obj

        if file_obj.size > MAX_PROFILE_IMAGE_BYTES:
            raise serializers.ValidationError('Profile picture must be 5MB or smaller.')

        try:
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)
            image = Image.open(file_obj)
            width, height = image.size
            image.verify()
        except (UnidentifiedImageError, OSError):
            raise serializers.ValidationError('Upload a valid image file.')
        finally:
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

        if width < MIN_PROFILE_IMAGE_DIMENSION or height < MIN_PROFILE_IMAGE_DIMENSION:
            raise serializers.ValidationError(
                f'Image is too small. Minimum size is {MIN_PROFILE_IMAGE_DIMENSION}x{MIN_PROFILE_IMAGE_DIMENSION}px.'
            )

        if width > MAX_PROFILE_IMAGE_DIMENSION or height > MAX_PROFILE_IMAGE_DIMENSION:
            raise serializers.ValidationError(
                f'Image is too large. Maximum size is {MAX_PROFILE_IMAGE_DIMENSION}x{MAX_PROFILE_IMAGE_DIMENSION}px.'
            )

        return file_obj

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        department = validated_data.pop('department', None)
        old_profile_picture = instance.profile_picture

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if role is not None:
            instance.role = role

        if department is not None:
            instance.department = department

        instance.save()

        if 'profile_picture' in validated_data:
            new_profile_picture = validated_data.get('profile_picture')
            if old_profile_picture and (new_profile_picture is None or old_profile_picture.name != getattr(instance.profile_picture, 'name', None)):
                old_profile_picture.delete(save=False)

        return instance


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    role = serializers.CharField(write_only=True, required=True)  # Accept role name as string
    course = serializers.CharField(write_only=True, required=False, allow_blank=True)
    department_id = serializers.PrimaryKeyRelatedField(
        write_only=True,
        queryset=Department.objects.all(),
        required=False,
        allow_null=True,
    )
    organization_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    organization_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    institution_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    institution_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    institution_verification_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'password', 'role', 'course', 'department_id', 'organization_id', 'organization_name', 'institution_name', 'institution_email', 'institution_verification_code']

    def validate(self, attrs):
        role_name = str(attrs.get('role', '')).strip().lower().replace('-', ' ').replace('_', ' ')
        institution_name = (attrs.get('institution_name') or '').strip()
        institution_email = (attrs.get('institution_email') or '').strip().lower()
        institution_verification_code = (attrs.get('institution_verification_code') or '').strip()
        organization_name = (attrs.get('organization_name') or '').strip()
        organization_id = attrs.get('organization_id')
        course = (attrs.get('course') or '').strip()
        department = attrs.get('department_id')

        if 'workplace' in role_name and not (organization_id or organization_name):
            raise serializers.ValidationError({'organization_name': 'Organization name is required for workplace supervisors.'})

        if ('student' in role_name or 'academic' in role_name) and not institution_name:
            raise serializers.ValidationError({'institution_name': 'Institution is required for students and academic supervisors.'})

        if 'student' in role_name and not course:
            raise serializers.ValidationError({'course': 'Course is required for students.'})

        if 'academic' in role_name and not department:
            raise serializers.ValidationError({'department_id': 'Department is required for academic supervisors.'})

        if 'student' in role_name or 'academic' in role_name:
            if not institution_email:
                raise serializers.ValidationError({'institution_email': 'Institution email is required for students and academic supervisors.'})

            if not institution_verification_code:
                raise serializers.ValidationError({'institution_verification_code': 'Institution verification code is required.'})

            cache_key = _institution_verification_cache_key(institution_email)
            expected_code = cache.get(cache_key)
            if not expected_code or str(expected_code).strip() != institution_verification_code:
                raise serializers.ValidationError({'institution_verification_code': 'Institution verification code is invalid or expired.'})

        return attrs

    def _generate_registration_number(self):
        while True:
            value = f"TEMP-{uuid.uuid4().hex[:8].upper()}"
            if not Student.objects.filter(registration_number=value).exists():
                return value

    def _ensure_role_profile(self, user, role_name, organization=None, department=None, course=None):
        normalized = role_name.strip().lower().replace('-', ' ').replace('_', ' ')

        if 'student' in normalized:
            student, _ = Student.objects.get_or_create(
                user=user,
                defaults={
                    'registration_number': self._generate_registration_number(),
                    'program': course or 'Not Set',
                    'year_of_study': 1,
                    'expected_graduation': timezone.now().date() + timedelta(days=365 * 4),
                }
            )
            if course and student.program != course:
                student.program = course
                student.save(update_fields=['program'])
            return

        if 'supervisor' in normalized or 'academic' in normalized or 'workplace' in normalized:
            supervisor_type = 'academic' if 'academic' in normalized else 'workplace'
            supervisor, _ = Supervisor.objects.get_or_create(
                user=user,
                defaults={
                    'supervisor_type': supervisor_type,
                    'organization': organization if supervisor_type == 'workplace' else None,
                    'department': department if supervisor_type == 'academic' else None,
                }
            )
            if supervisor_type == 'workplace' and organization and supervisor.organization_id != organization.organization_id:
                supervisor.organization = organization
                supervisor.save(update_fields=['organization'])
            if supervisor_type == 'academic' and department and supervisor.department_id != department.department_id:
                supervisor.department = department
                supervisor.save(update_fields=['department'])

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
        course = (validated_data.pop('course', '') or '').strip()
        department = validated_data.pop('department_id', None)
        organization_id = validated_data.pop('organization_id', None)
        organization_name = validated_data.pop('organization_name', '')
        institution_name = (validated_data.pop('institution_name', '') or '').strip()
        institution_email = (validated_data.pop('institution_email', '') or '').strip().lower()
        institution_verification_code = (validated_data.pop('institution_verification_code', '') or '').strip()

        # Get or create the role
        role, created = Role.objects.get_or_create(role_name=role_name)

        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            role=role,
            institution_name=institution_name,
            institution_email=institution_email,
            department=department,
            **{k: v for k, v in validated_data.items() if k != 'email'}
        )

        normalized = role_name.strip().lower().replace('-', ' ').replace('_', ' ')
        workplace_org = None
        if 'workplace' in normalized:
            workplace_org = self._resolve_workplace_organization(organization_id, organization_name)

        if ('student' in normalized or 'academic' in normalized) and institution_email and institution_verification_code:
            cache.delete(_institution_verification_cache_key(institution_email))

        self._ensure_role_profile(user, role_name, organization=workplace_org, department=department, course=course)
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