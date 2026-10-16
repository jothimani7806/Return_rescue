from rest_framework import permissions
from .models import UserRole

class IsManagerOrAdmin(permissions.BasePermission):
    """
    Allows access only to authenticated managers or admins.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role in [UserRole.MANAGER, UserRole.ADMIN]

class IsOwnerOrManager(permissions.BasePermission):
    """
    Allows customer to access only their own object, while managers have full access.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        if request.user.is_staff or (profile and profile.is_manager):
            return True
        # Check ownership on ReturnRequest or Notification
        if hasattr(obj, 'customer'):
            return obj.customer == request.user
        if hasattr(obj, 'recipient'):
            return obj.recipient == request.user
        return False
