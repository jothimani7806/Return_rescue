from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from core.views import serve_react_app

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    # Media files (uploaded customer return photos)
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    # Compiled frontend assets and root statics
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': settings.FRONTEND_DIR / 'assets'}),
    re_path(r'^(?P<path>[^/]+\.(svg|ico|png|jpg|jpeg|json|txt|js|css))$', serve, {'document_root': settings.FRONTEND_DIR}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# SPA fallback: Catch all remaining non-API, non-admin, non-media routes and serve React index.html
urlpatterns += [
    re_path(r'^(?!api/|admin/|media/).*$', serve_react_app),
]
