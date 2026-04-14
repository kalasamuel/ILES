from rest_framework import permissions

def get_role_name(user):
    return (user.role.role_name if user.role else '').strip().lower()

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to admin users.
    """ 
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return get_role_name(request.user) == 'admin'

class IsStudent(permissions.BasePermission):
    """
    Allows access only to students.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return 'student' in get_role_name(request.user) 
class IsSupervisor(permissions.BasePermission):
    """
    Allows access only to supervisors.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role_name = get_role_name(request.user)
        return 'supervisor' in role_name or 'academic' in role_name or 'workplace' in role_name 
    
class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object (student) or admins to edit it.
    Assumes the model instance has a way to relate back to a student.user.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        role_name = get_role_name(user)
        
        if role_name == 'admin':
            return True
                  