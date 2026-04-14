from rest_framework import permissions

def get_role_name(user):
    return (user.role.role_name if user.role else '').strip().lower()

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to admin users.
    """