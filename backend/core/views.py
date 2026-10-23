import os
import json
from decimal import Decimal
from django.http import Http404, HttpResponse
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Avg, Sum, F
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User

from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.authtoken.models import Token

from .models import (
    UserProfile,
    UserRole,
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
    InventoryTransactionType,
    Notification,
    AuditLog,
    DatasetSource,
    ReturnStatus,
    RecoveryOutcome,
    ImageViewLabel
)
from .serializers import (
    UserSerializer,
    CustomerListSerializer,
    ProductCategorySerializer,
    ProductSubcategorySerializer,
    ProductSerializer,
    ProductInspectionRuleSerializer,
    ReturnRequestSerializer,
    ReturnImageSerializer,
    AIInspectionSerializer,
    RecoveryRecommendationSerializer,
    RecoveryDecisionSerializer,
    RepairRecordSerializer,
    InventoryTransactionSerializer,
    NotificationSerializer,
    AuditLogSerializer,
    DatasetSourceSerializer
)
from .permissions import IsManagerOrAdmin, IsOwnerOrManager
from .rules_engine import CategoryAwareRecoveryEngine
from .ml_inference import VisualInspectionPipeline
from .dataset_service import DatasetAcquisitionService
from .mongodb import (
    save_user_to_mongodb,
    save_customer_record_to_mongodb,
    delete_customer_record_from_mongodb,
    log_audit_to_mongodb
)

# ==========================================
# AUTHENTICATION & CUSTOMER ACCOUNT VIEWS
# ==========================================

@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def register_user(request):
    """
    Public customer registration.
    Customer registration validates input, hashes password, saves persistently to database,
    strictly assigns CUSTOMER role, and issues authentication token.
    Customer registration NEVER grants manager permissions.
    """
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()

    if not username or not password:
        return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not email:
        return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check username uniqueness case-insensitively
    if User.objects.filter(username__iexact=username).exists():
        return Response({'error': 'A user with that username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check email uniqueness case-insensitively
    if User.objects.filter(email__iexact=email).exists():
        return Response({'error': 'An account with that email address already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(password) < 6:
        return Response({'error': 'Password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )

            # Strictly assign CUSTOMER role
            UserProfile.objects.create(
                user=user,
                role=UserRole.CUSTOMER
            )

            token, _ = Token.objects.get_or_create(user=user)

            # Persist customer user profile directly to MongoDB Atlas
            save_user_to_mongodb(user, role=UserRole.CUSTOMER)
    except Exception as e:
        return Response({'error': f'Failed to register account: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    serializer = UserSerializer(user)
    return Response({'message': 'Registration successful.', 'token': token.key, 'user': serializer.data}, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def login_user(request):
    """
    Standard authentication login.
    Supports email or username authentication, portal role verification, and token issuance.
    Uses case-insensitive lookup for username/email and Django's secure password verification.
    """
    identifier = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    expected_portal = request.data.get('portal', '').strip().lower()

    if not identifier or not password:
        return Response({'error': 'Username or email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Resolve candidate user by email or username case-insensitively
    candidate = None
    if '@' in identifier:
        candidate = User.objects.filter(email__iexact=identifier).first()
    if candidate is None:
        candidate = User.objects.filter(username__iexact=identifier).first()

    user = None
    if candidate is not None:
        user = authenticate(request, username=candidate.username, password=password)
        if user is None and not candidate.is_active and candidate.check_password(password):
            return Response({'error': 'This account has been deactivated. Please contact support.'}, status=status.HTTP_403_FORBIDDEN)

    if user is None:
        user = authenticate(request, username=identifier, password=password)

    if user is None:
        return Response({'error': 'Invalid username/email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return Response({'error': 'This account has been deactivated. Please contact support.'}, status=status.HTTP_403_FORBIDDEN)

    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={'role': UserRole.MANAGER if (user.is_staff or user.is_superuser) else UserRole.CUSTOMER}
    )

    is_mgr = profile.is_manager or user.is_staff or user.is_superuser

    # Role enforcement if manager portal was specified
    if expected_portal == 'manager' and not is_mgr:
        return Response({
            'error': 'Access denied: Manager privileges are required to sign in to the Manager Portal.'
        }, status=status.HTTP_403_FORBIDDEN)

    # Update last login timestamp
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])

    token, _ = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user)
    return Response({'message': 'Login successful.', 'token': token.key, 'user': serializer.data})


@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def logout_user(request):
    """
    Clear authentication credentials. Safe for all clients without 401 exceptions.
    """
    if request.user and request.user.is_authenticated:
        Token.objects.filter(user=request.user).delete()
    return Response({'message': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([IsManagerOrAdmin])
def list_customers(request):
    """
    Manager endpoint to view all registered customers and their return statistics.
    Never exposes passwords or sensitive authentication credentials.
    """
    search_q = request.query_params.get('search', '').strip()
    customers_qs = User.objects.filter(
        Q(profile__role=UserRole.CUSTOMER) | Q(is_staff=False, is_superuser=False)
    ).select_related('profile').annotate(
        returns_count=Count('return_requests')
    ).order_by('-date_joined')

    if search_q:
        customers_qs = customers_qs.filter(
            Q(username__icontains=search_q) |
            Q(email__icontains=search_q) |
            Q(first_name__icontains=search_q) |
            Q(last_name__icontains=search_q)
        )

    serializer = CustomerListSerializer(customers_qs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsManagerOrAdmin])
def toggle_customer_status(request, pk):
    """
    Manager endpoint to deactivate or activate a customer account safely
    without deleting customer records or historical return requests.
    """
    try:
        target_user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'Customer account not found.'}, status=status.HTTP_404_NOT_FOUND)

    if target_user.is_superuser or (hasattr(target_user, 'profile') and target_user.profile.is_manager):
        return Response({'error': 'Cannot modify manager or administrator accounts through this action.'}, status=status.HTTP_400_BAD_REQUEST)

    target_user.is_active = not target_user.is_active
    target_user.save(update_fields=['is_active'])

    AuditLog.objects.create(
        user=request.user,
        action='CUSTOMER_STATUS_TOGGLED',
        entity_type='User',
        entity_id=str(target_user.id),
        details={
            'username': target_user.username,
            'is_active': target_user.is_active
        }
    )

    action_str = 'activated' if target_user.is_active else 'deactivated'
    return Response({
        'message': f"Customer account '{target_user.username}' successfully {action_str}.",
        'is_active': target_user.is_active
    })


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    profile, _ = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={'role': UserRole.MANAGER if request.user.is_staff else UserRole.CUSTOMER}
    )

    if request.method in ['PUT', 'PATCH']:
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        phone_number = request.data.get('phone_number')
        department = request.data.get('department')

        if first_name is not None:
            request.user.first_name = first_name.strip()
        if last_name is not None:
            request.user.last_name = last_name.strip()
        if email is not None:
            request.user.email = email.strip()
        request.user.save()

        if phone_number is not None:
            profile.phone_number = phone_number.strip()
        if department is not None:
            profile.department = department.strip()
        profile.save()

        AuditLog.objects.create(
            user=request.user,
            action='PROFILE_NAME_UPDATED',
            entity_type='User',
            entity_id=str(request.user.id),
            details={
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'username': request.user.username
            }
        )

    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# ==========================================
# CATALOG & RULES VIEWSETS
# ==========================================

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all().prefetch_related('subcategories')
    serializer_class = ProductCategorySerializer
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAdmin()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        category = serializer.save()
        ProductInspectionRule.objects.get_or_create(
            category=category,
            defaults={
                'max_repair_cost_ratio': 0.50,
                'resale_min_condition_score': 0.60,
                'auto_recycle_if_unsafe': True,
                'functionality_questions': [
                    {'key': 'item_powers_on', 'label': f'Does the {category.name} power on / function properly?', 'type': 'boolean', 'default': True},
                    {'key': 'has_visible_structural_damage', 'label': 'Is there visible structural cracking or tearing?', 'type': 'boolean', 'default': False}
                ],
                'rule_description': f'Default baseline inspection rule for {category.name}'
            }
        )


class SubcategoryViewSet(viewsets.ModelViewSet):
    queryset = ProductSubcategory.objects.all()
    serializer_class = ProductSubcategorySerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAdmin()]
        return [permissions.AllowAny()]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related('category', 'subcategory')
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAdmin()]
        return [permissions.AllowAny()]

    @action(detail=False, methods=['get'])
    def lookup_sku(self, request):
        sku = request.query_params.get('sku', '').strip()
        if not sku:
            return Response({'error': 'SKU parameter required.'}, status=400)
        product = Product.objects.filter(sku__iexact=sku).first()
        if product:
            return Response(ProductSerializer(product).data)
        return Response({'error': 'Product SKU not found in catalog.'}, status=404)


class InspectionRuleViewSet(viewsets.ModelViewSet):
    queryset = ProductInspectionRule.objects.all()
    serializer_class = ProductInspectionRuleSerializer
    permission_classes = [IsManagerOrAdmin]


# ==========================================
# RETURN REQUEST VIEWSET & WORKFLOW
# ==========================================

class ReturnRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ReturnRequestSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create', 'upload_image']:
            return [permissions.IsAuthenticated()]
        return [IsManagerOrAdmin()]

    def get_queryset(self):
        user = getattr(self.request, 'user', None)
        if not user or not user.is_authenticated:
            return ReturnRequest.objects.none()

        qs = ReturnRequest.objects.all().select_related(
            'customer', 'category', 'subcategory', 'product',
            'ai_inspection', 'recommendation', 'decision', 'repair_record'
        ).prefetch_related('images')

        # Role isolation: Customer only sees their own requests
        profile = getattr(user, 'profile', None)
        if not (user.is_staff or (profile and profile.is_manager)):
            qs = qs.filter(customer=user)

        # Manager filters
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        category_param = self.request.query_params.get('category')
        if category_param:
            qs = qs.filter(category__slug=category_param)

        search_param = self.request.query_params.get('search')
        if search_param:
            qs = qs.filter(
                Q(return_id__icontains=search_param) |
                Q(product_name__icontains=search_param) |
                Q(sku__icontains=search_param) |
                Q(customer__username__icontains=search_param)
            )

        return qs

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        val = self.kwargs[lookup_url_kwarg]
        if str(val).isdigit():
            obj = queryset.filter(id=int(val)).first()
        else:
            obj = queryset.filter(return_id__iexact=str(val)).first()
        if not obj:
            raise Http404("Return request not found.")
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_destroy(self, instance):
        """
        Manager deletion of return queue records with persistent audit log entry.
        """
        AuditLog.objects.create(
            user=self.request.user,
            action='RETURN_RECORD_DELETED',
            entity_type='ReturnRequest',
            entity_id=str(instance.id),
            details={
                'return_id': instance.return_id,
                'product_name': instance.product_name,
                'customer': instance.customer.username,
                'status': instance.status
            }
        )
        # Delete from MongoDB Atlas and log
        delete_customer_record_from_mongodb(instance.return_id)
        log_audit_to_mongodb(
            self.request.user,
            'RETURN_RECORD_DELETED',
            'ReturnRequest',
            str(instance.id),
            {
                'return_id': instance.return_id,
                'product_name': instance.product_name,
                'customer': instance.customer.username,
                'status': instance.status
            }
        )
        instance.delete()

    def create(self, request, *args, **kwargs):
        """
        Customer multi-step return submission.
        Accepts return info, answers, and multiple uploaded images.
        Immediately triggers AI visual analysis & category-aware recommendation.
        """
        user = request.user
        category_id = request.data.get('category')
        category_slug = request.data.get('category_slug')

        if category_id:
            category = ProductCategory.objects.filter(id=category_id).first()
        elif category_slug:
            category = ProductCategory.objects.filter(slug=category_slug).first()
        else:
            category = ProductCategory.objects.filter(slug='other-and-custom-product-categories').first()

        if not category:
            return Response({'error': 'Valid product category is required.'}, status=400)

        # Parse condition answers JSON if sent as string from form data
        raw_answers = request.data.get('condition_answers', {})
        if isinstance(raw_answers, str):
            try:
                raw_answers = json.loads(raw_answers)
            except Exception:
                raw_answers = {}

        raw_accessories = request.data.get('missing_accessories', [])
        if isinstance(raw_accessories, str):
            try:
                raw_accessories = json.loads(raw_accessories)
            except Exception:
                raw_accessories = [raw_accessories] if raw_accessories else []

        sku = request.data.get('sku', '').strip()
        matched_product = Product.objects.filter(sku__iexact=sku).first() if sku else None

        # Build ReturnRequest instance
        return_req = ReturnRequest.objects.create(
            customer=user,
            product=matched_product,
            sku=sku,
            product_name=request.data.get('product_name', 'Returned Product'),
            category=category,
            unsupported_category_note=request.data.get('unsupported_category_note', ''),
            return_reason=request.data.get('return_reason', 'DEFECTIVE_OR_DAMAGED'),
            customer_description=request.data.get('customer_description', ''),
            condition_answers=raw_answers,
            is_functional=str(request.data.get('is_functional', 'true')).lower() in ['true', '1', 'yes'],
            packaging_condition=request.data.get('packaging_condition', 'ORIGINAL_OPENED'),
            missing_accessories=raw_accessories,
            status=ReturnStatus.AWAITING_INSPECTION
        )

        # Process uploaded images
        # Keys can be 'images', 'images[0]', or view-specific e.g. 'image_front'
        uploaded_images = []
        files = request.FILES.getlist('images')
        
        # Check view-specific inputs
        for view_choice in ImageViewLabel.values:
            file_key = f"image_{view_choice.lower()}"
            if file_key in request.FILES:
                f = request.FILES[file_key]
                ret_img = ReturnImage.objects.create(
                    return_request=return_req,
                    image=f,
                    view_label=view_choice
                )
                uploaded_images.append(ret_img)

        # Add remaining images with default or guessed view labels
        for idx, f in enumerate(files):
            view_label = ImageViewLabel.FRONT if idx == 0 else (ImageViewLabel.BACK if idx == 1 else ImageViewLabel.CLOSE_UP_DEFECT)
            ret_img = ReturnImage.objects.create(
                return_request=return_req,
                image=f,
                view_label=view_label
            )
            uploaded_images.append(ret_img)

        # Run AI visual inspection and category-aware recovery routing
        self._run_inspection_pipeline(return_req, uploaded_images)

        # Log audit entry
        AuditLog.objects.create(
            user=user,
            action="SUBMIT_RETURN",
            entity_type="ReturnRequest",
            entity_id=return_req.return_id,
            details={'product': return_req.product_name, 'images_count': len(uploaded_images)}
        )

        # Create confirmation notification for customer
        Notification.objects.create(
            recipient=user,
            title="Return Request Received",
            message=f"Your return request for '{return_req.product_name}' (ID: {return_req.return_id}) has been received and is undergoing automated visual inspection.",
            return_request=return_req,
            notification_type='RETURN_STATUS'
        )

        # Persist new customer return record to MongoDB Atlas Cloud
        save_customer_record_to_mongodb(return_req)

        serializer = ReturnRequestSerializer(return_req)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _run_inspection_pipeline(self, return_req, images=None):
        """Execute visual pipeline and recovery decision routing."""
        if images is None:
            images = list(return_req.images.all())

        # 1. Vision pipeline
        ai_result = VisualInspectionPipeline.inspect(return_req, images)

        ai_inspection, _ = AIInspection.objects.update_or_create(
            return_request=return_req,
            defaults={
                'model_name': ai_result['model_name'],
                'model_version': ai_result['model_version'],
                'is_category_supported': ai_result['is_category_supported'],
                'overall_condition': ai_result['overall_condition'],
                'confidence_score': ai_result['confidence_score'],
                'detected_defects': ai_result['detected_defects'],
                'image_evaluations': ai_result['image_evaluations'],
                'requires_human_inspection': ai_result['requires_human_inspection'],
                'uncertainty_reason': ai_result['uncertainty_reason'],
            }
        )

        # 2. Recovery decision engine
        recommendation_data = CategoryAwareRecoveryEngine.evaluate(return_req, ai_inspection)

        RecoveryRecommendation.objects.update_or_create(
            return_request=return_req,
            defaults={
                'recommended_action': recommendation_data['recommended_action'],
                'confidence': recommendation_data['confidence'],
                'rationale': recommendation_data['rationale'],
                'estimated_repair_cost': recommendation_data['estimated_repair_cost'],
                'estimated_resale_value': recommendation_data['estimated_resale_value'],
                'safety_alert': recommendation_data['safety_alert'],
                'rules_applied': recommendation_data['rules_applied'],
            }
        )

        return_req.status = ReturnStatus.AWAITING_MANAGER_APPROVAL
        return_req.save(update_fields=['status'])

    @action(detail=True, methods=['post'], permission_classes=[IsManagerOrAdmin])
    def trigger_ai_inspection(self, request, pk=None):
        """Re-run AI inspection on an existing return request."""
        return_req = self.get_object()
        self._run_inspection_pipeline(return_req)
        return Response(ReturnRequestSerializer(return_req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsManagerOrAdmin])
    def approve_decision(self, request, pk=None):
        """
        Manager reviews AI recommendation and executes one of the 5 authorized decision actions:
        1. APPROVE: Approve the model's recommendation.
        2. OVERRIDE: Override AI recommendation with an alternate recovery channel (requires reason).
        3. REJECT: Reject the return request (requires reason).
        4. REQUEST_INFO: Request additional photos or information from customer (requires note).
        5. FLAG_MANUAL: Flag for manual physical inspection (uncertain model / unsupported category).
        Persists decision, updates return status, creates inventory records if applicable,
        generates audit trail, and notifies customer.
        """
        return_req = self.get_object()
        action_type = request.data.get('action_type', '').strip().upper()
        final_action = request.data.get('final_action')
        is_override = bool(request.data.get('is_override', False))
        override_reason = request.data.get('override_reason', '').strip()
        approval_reason = request.data.get('approval_reason', '').strip()
        manager_notes = request.data.get('manager_notes', '').strip()
        checklist_verification = request.data.get('checklist_verification', {})
        confirmed_defects = request.data.get('confirmed_defects', [])

        # Get original recommendation if present
        orig_rec = ''
        if hasattr(return_req, 'recommendation') and return_req.recommendation:
            orig_rec = return_req.recommendation.recommended_action

        previous_status = return_req.status

        # Deduce action_type if not explicitly passed
        if not action_type:
            if final_action == 'REJECTED':
                action_type = 'REJECT'
            elif final_action == 'MANUAL_INSPECTION':
                action_type = 'FLAG_MANUAL'
            elif final_action == 'INFO_REQUESTED':
                action_type = 'REQUEST_INFO'
            elif is_override or (orig_rec and final_action != orig_rec):
                action_type = 'OVERRIDE'
            else:
                action_type = 'APPROVE'

        # Execute decision branch
        if action_type in ['APPROVE', 'APPROVE_RECOMMENDATION']:
            final_action = final_action or orig_rec or RecoveryOutcome.RESTOCK
            if final_action not in RecoveryOutcome.values:
                return Response({'error': f"Invalid recovery outcome: {final_action}"}, status=400)
            is_override = False
            return_req.final_recovery_outcome = final_action

            if final_action == RecoveryOutcome.RESTOCK:
                return_req.status = ReturnStatus.RESTOCKED
                tx_type = InventoryTransactionType.RESTOCK_AVAILABLE
                loc = "Main Fulfillment Hub - Bay R1"
            elif final_action == RecoveryOutcome.RESALE:
                return_req.status = ReturnStatus.LISTED_FOR_RESALE
                tx_type = InventoryTransactionType.RESALE_OUTLET
                loc = "Secondary Marketplace Clearing"
            elif final_action == RecoveryOutcome.REPAIR:
                return_req.status = ReturnStatus.IN_REPAIR
                tx_type = InventoryTransactionType.REPAIR_HOLD
                loc = "Refurbishment Tech Center"
                RepairRecord.objects.get_or_create(
                    return_request=return_req,
                    defaults={'repair_status': 'PENDING_ASSESSMENT', 'notes': manager_notes}
                )
            elif final_action == RecoveryOutcome.RECYCLING:
                return_req.status = ReturnStatus.RECYCLED
                tx_type = InventoryTransactionType.RECYCLE_DISPOSAL
                loc = "Eco-Recycle Partner Facility"
            else:
                return_req.status = ReturnStatus.DECISION_APPROVED
                tx_type = InventoryTransactionType.RETURN_INTAKE
                loc = "Intake Verification"

            customer_notif_title = f"Return Approved: {final_action}"
            customer_notif_msg = f"Your return request for '{return_req.product_name}' has been approved and routed to {final_action}."

        elif action_type in ['OVERRIDE', 'OVERRIDE_RECOMMENDATION']:
            if not final_action or final_action not in RecoveryOutcome.values:
                return Response({'error': f"Valid target recovery action is required for override. Must be one of: {RecoveryOutcome.values}"}, status=400)
            if not override_reason:
                return Response({'error': 'An override reason is required when modifying the AI recommendation.'}, status=400)

            is_override = True
            return_req.final_recovery_outcome = final_action

            if final_action == RecoveryOutcome.RESTOCK:
                return_req.status = ReturnStatus.RESTOCKED
                tx_type = InventoryTransactionType.RESTOCK_AVAILABLE
                loc = "Main Fulfillment Hub - Bay R1"
            elif final_action == RecoveryOutcome.RESALE:
                return_req.status = ReturnStatus.LISTED_FOR_RESALE
                tx_type = InventoryTransactionType.RESALE_OUTLET
                loc = "Secondary Marketplace Clearing"
            elif final_action == RecoveryOutcome.REPAIR:
                return_req.status = ReturnStatus.IN_REPAIR
                tx_type = InventoryTransactionType.REPAIR_HOLD
                loc = "Refurbishment Tech Center"
                RepairRecord.objects.get_or_create(
                    return_request=return_req,
                    defaults={'repair_status': 'PENDING_ASSESSMENT', 'notes': manager_notes}
                )
            else:
                return_req.status = ReturnStatus.RECYCLED
                tx_type = InventoryTransactionType.RECYCLE_DISPOSAL
                loc = "Eco-Recycle Partner Facility"

            customer_notif_title = f"Return Decision Updated: {final_action}"
            customer_notif_msg = f"Your return request for '{return_req.product_name}' was reviewed by a manager and assigned to {final_action}."

        elif action_type in ['REJECT', 'REJECT_RETURN']:
            reason = override_reason or approval_reason or manager_notes
            if not reason:
                return Response({'error': 'Please provide a reason for rejecting the return request.'}, status=400)

            final_action = 'REJECTED'
            is_override = True
            override_reason = reason
            return_req.status = ReturnStatus.REJECTED
            return_req.final_recovery_outcome = None
            tx_type = None

            customer_notif_title = "Return Request Rejected"
            customer_notif_msg = f"Your return request for '{return_req.product_name}' was rejected. Reason: {reason}"

        elif action_type in ['FLAG_MANUAL', 'MANUAL_INSPECTION']:
            reason = override_reason or approval_reason or manager_notes or "Model uncertainty or unsupported category requires hands-on specialist inspection."
            final_action = 'MANUAL_INSPECTION'
            is_override = False
            return_req.status = ReturnStatus.MANUAL_INSPECTION
            return_req.final_recovery_outcome = None
            tx_type = None

            customer_notif_title = "Return Pending Physical Inspection"
            customer_notif_msg = f"Your return request for '{return_req.product_name}' has been routed to our technical team for specialized in-person inspection."

        elif action_type in ['REQUEST_INFO', 'INFO_REQUESTED']:
            reason = override_reason or approval_reason or manager_notes
            if not reason:
                return Response({'error': 'Please specify the additional information or photos required.'}, status=400)

            final_action = 'INFO_REQUESTED'
            is_override = False
            return_req.status = ReturnStatus.INFO_REQUESTED
            return_req.final_recovery_outcome = None
            tx_type = None

            customer_notif_title = "Additional Information Requested"
            customer_notif_msg = f"Our inspection team requires additional details for your return of '{return_req.product_name}': {reason}"

        else:
            return Response({'error': f"Unknown decision action type: {action_type}"}, status=400)

        # Save return request updates
        return_req.save()

        # Record decision in database
        decision, _ = RecoveryDecision.objects.update_or_create(
            return_request=return_req,
            defaults={
                'manager': request.user,
                'final_action': final_action,
                'original_recommendation': orig_rec,
                'is_override': is_override,
                'override_reason': override_reason,
                'approval_reason': approval_reason,
                'manager_notes': manager_notes,
                'checklist_verification': checklist_verification,
                'confirmed_defects': confirmed_defects,
                'previous_status': previous_status,
                'new_status': return_req.status,
                'decided_at': timezone.now()
            }
        )

        # Record inventory transaction if applicable
        if tx_type:
            InventoryTransaction.objects.create(
                return_request=return_req,
                transaction_type=tx_type,
                sku=return_req.sku or f"SKU-{return_req.return_id}",
                quantity=1,
                location=loc,
                notes=f"Manager {request.user.username} executed {action_type} -> {final_action}. Override: {is_override}.",
                performed_by=request.user
            )

        # Audit log entry
        AuditLog.objects.create(
            user=request.user,
            action=f"DECISION_{action_type}",
            entity_type="ReturnRequest",
            entity_id=return_req.return_id,
            details={
                'action_type': action_type,
                'original_recommendation': orig_rec,
                'final_action': final_action,
                'is_override': is_override,
                'override_reason': override_reason,
                'previous_status': previous_status,
                'new_status': return_req.status
            }
        )

        # Send notification to customer
        Notification.objects.create(
            recipient=return_req.customer,
            title=customer_notif_title,
            message=customer_notif_msg,
            return_request=return_req,
            notification_type='RETURN_STATUS'
        )

        # Persist decision and updated return status to MongoDB Atlas Cloud
        save_customer_record_to_mongodb(return_req)
        log_audit_to_mongodb(
            request.user,
            f"DECISION_{action_type}",
            "ReturnRequest",
            return_req.return_id,
            {
                'action_type': action_type,
                'final_action': final_action,
                'original_recommendation': orig_rec,
                'is_override': is_override,
                'override_reason': override_reason
            }
        )

        return Response(ReturnRequestSerializer(return_req).data)


# ==========================================
# MANAGER DASHBOARD METRICS VIEW
# ==========================================

@api_view(['GET'])
@permission_classes([IsManagerOrAdmin])
def dashboard_metrics(request):
    """
    Computes all operational metrics directly from real database records.
    Distinguishes predicted AI outcomes from final approved manager outcomes.
    """
    returns_qs = ReturnRequest.objects.all()

    total_returns = returns_qs.count()
    pending_inspection = returns_qs.filter(status=ReturnStatus.AWAITING_INSPECTION).count()
    awaiting_approval = returns_qs.filter(status=ReturnStatus.AWAITING_MANAGER_APPROVAL).count()

    # Final approved outcomes
    restock_count = returns_qs.filter(final_recovery_outcome=RecoveryOutcome.RESTOCK).count()
    repair_count = returns_qs.filter(final_recovery_outcome=RecoveryOutcome.REPAIR).count()
    resale_count = returns_qs.filter(final_recovery_outcome=RecoveryOutcome.RESALE).count()
    recycling_count = returns_qs.filter(final_recovery_outcome=RecoveryOutcome.RECYCLING).count()

    # Category-wise volume
    category_counts = (
        returns_qs.values('category__name', 'category__slug')
        .annotate(count=Count('id'))
        .order_by('-count')[:8]
    )

    # Recovery rates per category
    category_recovery = []
    for cat in ProductCategory.objects.filter(is_active=True)[:10]:
        cat_returns = returns_qs.filter(category=cat)
        tot = cat_returns.count()
        if tot > 0:
            restocked = cat_returns.filter(final_recovery_outcome=RecoveryOutcome.RESTOCK).count()
            resold = cat_returns.filter(final_recovery_outcome=RecoveryOutcome.RESALE).count()
            repaired = cat_returns.filter(final_recovery_outcome=RecoveryOutcome.REPAIR).count()
            recycled = cat_returns.filter(final_recovery_outcome=RecoveryOutcome.RECYCLING).count()
            recovered_pct = round(((restocked + resold + repaired) / tot) * 100, 1)
            category_recovery.append({
                'category': cat.name,
                'slug': cat.slug,
                'total': tot,
                'recovered_rate': recovered_pct,
                'restock': restocked,
                'resale': resold,
                'repair': repaired,
                'recycling': recycled,
            })

    # Total recovered value & repair costs from recommendations
    rec_aggregates = RecoveryRecommendation.objects.aggregate(
        total_repair_cost=Sum('estimated_repair_cost'),
        total_resale_value=Sum('estimated_resale_value')
    )

    # Safety alerts (unaddressed or critical)
    safety_alerts_qs = RecoveryRecommendation.objects.exclude(safety_alert='').select_related('return_request')
    safety_alerts = [
        {
            'return_id': r.return_request.return_id,
            'product_name': r.return_request.product_name,
            'alert': r.safety_alert,
            'created_at': r.created_at
        } for r in safety_alerts_qs[:5]
    ]

    # Low-confidence AI predictions
    low_confidence_qs = AIInspection.objects.filter(
        Q(requires_human_inspection=True) | Q(confidence_score__lt=0.65)
    ).select_related('return_request')
    low_confidence_list = [
        {
            'return_id': insp.return_request.return_id,
            'product_name': insp.return_request.product_name,
            'confidence': insp.confidence_score,
            'condition': insp.overall_condition,
            'reason': insp.uncertainty_reason or "Low model confidence",
        } for insp in low_confidence_qs[:5]
    ]

    # Status distribution
    status_distribution = list(
        returns_qs.values('status').annotate(count=Count('id'))
    )

    # Returns over time (last 7 days)
    recent_activity = [
        {
            'id': r.id,
            'return_id': r.return_id,
            'product_name': r.product_name,
            'category': r.category.name,
            'status': r.status,
            'outcome': r.final_recovery_outcome,
            'created_at': r.created_at
        } for r in returns_qs.order_by('-created_at')[:30]
    ]

    return Response({
        'total_returns': total_returns,
        'pending_inspection': pending_inspection,
        'awaiting_approval': awaiting_approval,
        'restock_count': restock_count,
        'repair_count': repair_count,
        'resale_count': resale_count,
        'recycling_count': recycling_count,
        'recovered_value': float(rec_aggregates.get('total_resale_value') or 0.0),
        'estimated_repair_cost': float(rec_aggregates.get('total_repair_cost') or 0.0),
        'category_counts': list(category_counts),
        'category_recovery': category_recovery,
        'safety_alerts': safety_alerts,
        'low_confidence_list': low_confidence_list,
        'status_distribution': status_distribution,
        'recent_activity': recent_activity,
    })


# ==========================================
# DATASET MANAGEMENT VIEWSET
# ==========================================

class DatasetSourceViewSet(viewsets.ModelViewSet):
    queryset = DatasetSource.objects.all()
    serializer_class = DatasetSourceSerializer
    permission_classes = [IsManagerOrAdmin]

    @action(detail=False, methods=['post'])
    def seed_registry(self, request):
        count = DatasetAcquisitionService.seed_registry()
        return Response({'message': f'Dataset source registry updated. {count} new sources added.'})

    @action(detail=True, methods=['post'])
    def trigger_download(self, request, pk=None):
        result = DatasetAcquisitionService.trigger_download(pk)
        return Response(result)

    @action(detail=True, methods=['post'])
    def validate_dataset(self, request, pk=None):
        report = DatasetAcquisitionService.validate_dataset_files(pk)
        return Response({'message': 'Validation completed.', 'report': report})


# ==========================================
# INVENTORY, NOTIFICATIONS, AUDIT VIEWSETS
# ==========================================

class InventoryTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryTransaction.objects.all().select_related('return_request', 'performed_by')
    serializer_class = InventoryTransactionSerializer
    permission_classes = [IsManagerOrAdmin]


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = getattr(self.request, 'user', None)
        if not user or not user.is_authenticated:
            return Notification.objects.none()
        return Notification.objects.filter(recipient=user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response({'status': 'marked read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        if request.user and request.user.is_authenticated:
            Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all marked read'})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [IsManagerOrAdmin]


# ==========================================
# SINGLE-PORT REACT FRONTEND SERVING VIEW
# ==========================================

def serve_react_app(request):
    """
    Serves the compiled React application entry point (index.html).
    Allows running frontend and backend on one single externally accessible port.
    """
    index_file = getattr(settings, 'FRONTEND_DIR', None)
    if index_file:
        index_html = index_file / 'index.html'
        if os.path.exists(index_html):
            with open(index_html, 'r', encoding='utf-8') as f:
                return HttpResponse(f.read(), content_type='text/html')

    # When backend is running in cloud mode (Render) where frontend is hosted on Vercel
    return HttpResponse(
        """<!DOCTYPE html>
        <html>
        <head>
          <title>Return Rescue API - Operational</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { background: #080c16; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { text-align: center; max-width: 480px; width: 100%; padding: 40px 32px; border: 1px solid rgba(99,102,241,0.25); border-radius: 20px; background: rgba(15,23,42,0.9); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
            h2 { color: #f8fafc; margin-top: 12px; margin-bottom: 8px; font-size: 24px; font-weight: 700; }
            .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); border-radius: 9999px; font-size: 13px; font-weight: 600; }
            .badge::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
            p { color: #94a3b8; font-size: 15px; margin: 12px 0; line-height: 1.6; }
            a { color: #818cf8; text-decoration: none; font-weight: 600; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">API System Operational</span>
            <h2>Return Rescue API Backend</h2>
            <p>Django REST Framework API is running and healthy.</p>
            <p>REST API root: <a href="/api/">/api/</a></p>
          </div>
        </body>
        </html>""",
        status=200,
        content_type='text/html'
    )
