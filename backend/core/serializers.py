from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile,
    ProductCategory,
    ProductSubcategory,
    Product,
    ProductInspectionRule,
    ReturnRequest,
    ReturnImage,
    AIInspection,
    RecoveryRecommendation,
    RecoveryDecision,
    RepairRecord,
    InventoryTransaction,
    Notification,
    AuditLog,
    DatasetSource,
    ReturnStatus,
    RecoveryOutcome,
)

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'phone_number', 'department']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    is_manager = serializers.BooleanField(source='profile.is_manager', read_only=True)
    is_customer = serializers.BooleanField(source='profile.is_customer', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'is_manager', 'is_customer']

class ProductSubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSubcategory
        fields = ['id', 'name', 'slug', 'description']

class ProductInspectionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductInspectionRule
        fields = '__all__'

class ProductCategorySerializer(serializers.ModelSerializer):
    subcategories = ProductSubcategorySerializer(many=True, read_only=True)
    inspection_rule = ProductInspectionRuleSerializer(read_only=True)

    class Meta:
        model = ProductCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon',
            'is_active', 'is_ai_supported', 'ai_support_notes',
            'subcategories', 'inspection_rule'
        ]

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'

class ReturnImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnImage
        fields = ['id', 'image', 'view_label', 'image_quality_status', 'quality_score', 'uploaded_at']

class AIInspectionSerializer(serializers.ModelSerializer):
    overall_condition_display = serializers.CharField(source='get_overall_condition_display', read_only=True)

    class Meta:
        model = AIInspection
        fields = '__all__'

class RecoveryRecommendationSerializer(serializers.ModelSerializer):
    recommended_action_display = serializers.CharField(source='get_recommended_action_display', read_only=True)

    class Meta:
        model = RecoveryRecommendation
        fields = '__all__'

class RecoveryDecisionSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source='manager.username', read_only=True)
    final_action_display = serializers.CharField(source='get_final_action_display', read_only=True)

    class Meta:
        model = RecoveryDecision
        fields = '__all__'

class RepairRecordSerializer(serializers.ModelSerializer):
    repair_status_display = serializers.CharField(source='get_repair_status_display', read_only=True)

    class Meta:
        model = RepairRecord
        fields = '__all__'

class InventoryTransactionSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.username', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = '__all__'

class ReturnRequestSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_first_name = serializers.CharField(source='customer.first_name', read_only=True)
    customer_last_name = serializers.CharField(source='customer.last_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.profile.phone_number', read_only=True, default='')
    return_reason_display = serializers.CharField(source='get_return_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    final_recovery_outcome_display = serializers.CharField(source='get_final_recovery_outcome_display', read_only=True)
    images = ReturnImageSerializer(many=True, read_only=True)
    ai_inspection = AIInspectionSerializer(read_only=True)
    recommendation = RecoveryRecommendationSerializer(read_only=True)
    decision = RecoveryDecisionSerializer(read_only=True)
    repair_record = RepairRecordSerializer(read_only=True)

    class Meta:
        model = ReturnRequest
        fields = '__all__'

class CustomerListSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True, default='CUSTOMER')
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True, default='')
    department = serializers.CharField(source='profile.department', read_only=True, default='')
    returns_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'department', 'is_active',
            'date_joined', 'last_login', 'returns_count'
        ]

class DatasetSourceSerializer(serializers.ModelSerializer):
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)
    status_display = serializers.CharField(source='get_download_status_display', read_only=True)

    class Meta:
        model = DatasetSource
        fields = '__all__'
