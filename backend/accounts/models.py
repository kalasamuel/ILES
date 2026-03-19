import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

from django.contrib.auth.models import BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        # We need to handle the 'role' since it's a non-nullable ForeignKey
        if 'role' not in extra_fields:
            # This creates a default Admin role if it doesn't exist
            admin_role, _ = Role.objects.get_or_create(role_name="Admin")
            extra_fields['role'] = admin_role

        return self.create_user(email, password, **extra_fields)

class Role(models.Model):
    role_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role_name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.role_name


class Department(models.Model):
    department_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    department_name = models.CharField(max_length=100)
    faculty = models.CharField(max_length=100)
    university = models.CharField(max_length=100)

    def __str__(self):
        return self.department_name


class User(AbstractUser):
    objects = UserManager()
    username = None  # Remove the username field
    
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name'] #excluded 'role' just for development purposes

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Student(models.Model):
    student_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    registration_number = models.CharField(max_length=50, unique=True)
    program = models.CharField(max_length=100)
    year_of_study = models.IntegerField()
    expected_graduation = models.DateField()

    def __str__(self):
        return self.registration_number


class Supervisor(models.Model):
    SUPERVISOR_TYPES = [
        ('workplace', 'Workplace'),
        ('academic', 'Academic'),
    ]

    supervisor_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    supervisor_type = models.CharField(max_length=20, choices=SUPERVISOR_TYPES)
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.user} ({self.supervisor_type})"
