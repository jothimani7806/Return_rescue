"""
Custom Authentication Classes for Return Rescue API.
Enables seamless SPA (Single Page Application) communication without cross-origin CSRF friction
while preserving standard DRF Session and Basic authentication.
"""
from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication subclass that bypasses CSRF enforcement for API endpoints.
    Used for REST API clients that authenticate via standard cookies / credentials.
    """
    def enforce_csrf(self, request):
        # Do not enforce CSRF checks on API endpoints
        return None
