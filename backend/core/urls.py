from django.urls import path, re_path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from .views import (
    register_user,
    login_user,
    logout_user,
    current_user,
    dashboard_metrics,
    CategoryViewSet,
    SubcategoryViewSet,
    ProductViewSet,
    InspectionRuleViewSet,
    ReturnRequestViewSet,
    DatasetSourceViewSet,
    InventoryTransactionViewSet,
    NotificationViewSet,
    AuditLogViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'subcategories', SubcategoryViewSet, basename='subcategory')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'rules', InspectionRuleViewSet, basename='rule')
router.register(r'returns', ReturnRequestViewSet, basename='return')
router.register(r'datasets', DatasetSourceViewSet, basename='dataset')
router.register(r'inventory', InventoryTransactionViewSet, basename='inventory')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    # Auth endpoints
    path('auth/register/', register_user, name='register'),
    path('auth/login/', login_user, name='login'),
    path('auth/logout/', logout_user, name='logout'),
    path('auth/me/', current_user, name='current-user'),
    path('auth/profile/', current_user, name='update-profile'),

    # Dashboard Metrics
    path('metrics/dashboard/', dashboard_metrics, name='dashboard-metrics'),

    # ViewSets
    path('', include(router.urls)),

    # Catch-all for undefined API routes to guarantee 404 JSON response
    re_path(r'^.*$', lambda request: JsonResponse({'error': 'API endpoint not found.'}, status=404)),
]
