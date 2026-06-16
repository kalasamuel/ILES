from rest_framework import permissions

def get_role_name(user):
    return (user.role.role_name if user.role else '').strip().lower()

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return get_role_name(request.user) == 'admin'

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return 'student' in get_role_name(request.user) 
class IsSupervisor(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role_name = get_role_name(request.user)
        return 'supervisor' in role_name or 'academic' in role_name or 'workplace' in role_name 
    
class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        role_name = get_role_name(user)
        
        if role_name == 'admin':
            return True
        if hasattr(obj, 'placement') and hasattr(obj.placement, 'student'):
            return obj.placement.student.user_id == user.user_id
        if hasattr(obj, 'student') and hasattr(obj.student, 'user'):
            return obj.student.user_id == user.user_id
        if hasattr(obj, 'user'):
            return obj.user.user_id == user.user_id
        return False
                  