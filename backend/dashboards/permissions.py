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