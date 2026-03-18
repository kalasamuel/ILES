from django.contrib import admin
from .models import Role, Department, User, Student, Supervisor

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['role_name']

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['department_name', 'faculty', 'university']

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'role', 'department', 'is_active']

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['registration_number', 'program', 'year_of_study']

@admin.register(Supervisor)
class SupervisorAdmin(admin.ModelAdmin):
    list_display = ['user', 'supervisor_type', 'organization', 'department']
