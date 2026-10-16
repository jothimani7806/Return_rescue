import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class UserRole(models.TextChoices):
    CUSTOMER = 'CUSTOMER', 'Customer'
    MANAGER = 'MANAGER', 'Manager'
    ADMIN = 'ADMIN', 'Administrator'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.CUSTOMER)
    phone_number = models.CharField(max_length=30, blank=True)
    department = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

    @property
    def is_manager(self):
        return self.role in [UserRole.MANAGER, UserRole.ADMIN] or self.user.is_staff or self.user.is_superuser

    @property
    def is_customer(self):
        return self.role == UserRole.CUSTOMER


class ProductCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='Package', help_text='Lucide icon name')
    is_active = models.BooleanField(default=True)
    is_ai_supported = models.BooleanField(default=False, help_text='Trained vision model available for this category')
    ai_support_notes = models.TextField(blank=True, help_text='Model status, verified datasets, and limitations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Product Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class ProductSubcategory(models.Model):
    category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE, related_name='subcategories')
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Product Subcategories'
        unique_together = ('category', 'slug')
        ordering = ['name']

    def __str__(self):
        return f"{self.category.name} > {self.name}"


class Product(models.Model):
    sku = models.CharField(max_length=64, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    category = models.ForeignKey(ProductCategory, on_delete=models.PROTECT, related_name='products')
    subcategory = models.ForeignKey(ProductSubcategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    brand = models.CharField(max_length=100, blank=True)
    model_number = models.CharField(max_length=100, blank=True)
    retail_price = models.DecimalField(max_digits=10, decimal_places=2)
    expected_salvage_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    resale_eligible = models.BooleanField(default=True)
    is_hygiene_sensitive = models.BooleanField(default=False)
    is_safety_critical = models.BooleanField(default=False)
    requires_serial_number = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sku} - {self.name}"


class ProductInspectionRule(models.Model):
    category = models.OneToOneField(ProductCategory, on_delete=models.CASCADE, related_name='inspection_rule')
    defect_checklist = models.JSONField(default=list, help_text='List of supported defects for visual inspection')
    functionality_questions = models.JSONField(default=list, help_text='Category-specific functional test questions')
    safety_checklist = models.JSONField(default=list, help_text='Specific safety hazard checks')
    max_repair_cost_ratio = models.FloatField(default=0.45, help_text='Max repair cost as ratio of retail price before recycling')
    resale_min_condition_score = models.FloatField(default=0.60, help_text='Minimum cosmetic score for resale')
    auto_recycle_if_unsafe = models.BooleanField(default=True)
    rule_description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Rules for {self.category.name}"


class ReturnReason(models.TextChoices):
    DEFECTIVE_OR_DAMAGED = 'DEFECTIVE_OR_DAMAGED', 'Defective or Damaged'
    NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED', 'Item Not as Described'
    WRONG_ITEM_SENT = 'WRONG_ITEM_SENT', 'Wrong Item Sent'
    SIZE_OR_FIT_ISSUE = 'SIZE_OR_FIT_ISSUE', 'Size or Fit Issue'
    CHANGED_MIND = 'CHANGED_MIND', 'Changed Mind / No Longer Needed'
    MISSING_PARTS = 'MISSING_PARTS', 'Missing Parts or Accessories'
    OTHER = 'OTHER', 'Other Reason'


class ReturnStatus(models.TextChoices):
    SUBMITTED = 'SUBMITTED', 'Submitted'
    AWAITING_INSPECTION = 'AWAITING_INSPECTION', 'Pending AI Analysis'
    INSPECTED_AI = 'INSPECTED_AI', 'AI Inspected'
    AWAITING_MANAGER_APPROVAL = 'AWAITING_MANAGER_APPROVAL', 'Pending Manager Review'
    DECISION_APPROVED = 'DECISION_APPROVED', 'Approved'
    OVERRIDDEN = 'OVERRIDDEN', 'Overridden'
    IN_REPAIR = 'IN_REPAIR', 'In Repair'
    RESTOCKED = 'RESTOCKED', 'Restocked'
    LISTED_FOR_RESALE = 'LISTED_FOR_RESALE', 'Listed for Resale'
    RECYCLED = 'RECYCLED', 'Recycled'
    REJECTED = 'REJECTED', 'Rejected'
    MANUAL_INSPECTION = 'MANUAL_INSPECTION', 'Pending Manual Inspection'
    INFO_REQUESTED = 'INFO_REQUESTED', 'Information Requested'
    COMPLETED = 'COMPLETED', 'Completed'


class RecoveryOutcome(models.TextChoices):
    RESTOCK = 'RESTOCK', 'Restock (Full Inventory Return)'
    RESALE = 'RESALE', 'Resale (Secondary Market / Discount)'
    REPAIR = 'REPAIR', 'Repair (Refurbish & Fix)'
    RECYCLING = 'RECYCLING', 'Recycling (Safe Material Reclamation)'


class PackagingCondition(models.TextChoices):
    ORIGINAL_SEALED = 'ORIGINAL_SEALED', 'Original Sealed Packaging'
    ORIGINAL_OPENED = 'ORIGINAL_OPENED', 'Original Packaging (Opened / Intact)'
    DAMAGED_BOX = 'DAMAGED_BOX', 'Packaging Damaged / Torn'
    NO_PACKAGING = 'NO_PACKAGING', 'No Original Packaging'


class ReturnRequest(models.Model):
    return_id = models.CharField(max_length=32, unique=True, db_index=True)
    customer = models.ForeignKey(User, on_delete=models.PROTECT, related_name='return_requests')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='returns')
    sku = models.CharField(max_length=64, blank=True)
    product_name = models.CharField(max_length=255)
    category = models.ForeignKey(ProductCategory, on_delete=models.PROTECT, related_name='return_requests')
    subcategory = models.ForeignKey(ProductSubcategory, on_delete=models.SET_NULL, null=True, blank=True)
    unsupported_category_note = models.TextField(blank=True)
    return_reason = models.CharField(max_length=40, choices=ReturnReason.choices)
    customer_description = models.TextField()
    condition_answers = models.JSONField(default=dict, blank=True)
    is_functional = models.BooleanField(default=True, help_text='Customer reported functional state')
    packaging_condition = models.CharField(max_length=30, choices=PackagingCondition.choices, default=PackagingCondition.ORIGINAL_OPENED)
    missing_accessories = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=40, choices=ReturnStatus.choices, default=ReturnStatus.SUBMITTED, db_index=True)
    final_recovery_outcome = models.CharField(max_length=20, choices=RecoveryOutcome.choices, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.return_id} - {self.product_name} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.return_id:
            short_id = uuid.uuid4().hex[:8].upper()
            self.return_id = f"RET-{timezone.now().year}-{short_id}"
        super().save(*args, **kwargs)


class ImageViewLabel(models.TextChoices):
    FRONT = 'FRONT', 'Front View'
    BACK = 'BACK', 'Back View'
    SIDE = 'SIDE', 'Side / Profile View'
    PACKAGING = 'PACKAGING', 'Packaging / Box'
    CLOSE_UP_DEFECT = 'CLOSE_UP_DEFECT', 'Defect Close-up'
    SERIAL_LABEL = 'SERIAL_LABEL', 'Serial Number / Label'
    ACCESSORIES = 'ACCESSORIES', 'Included Accessories'
    OTHER = 'OTHER', 'Other View'


class ImageQualityStatus(models.TextChoices):
    VALID = 'VALID', 'Good Quality'
    BLURRY = 'BLURRY', 'Image is Blurry'
    TOO_DARK = 'TOO_DARK', 'Underexposed / Too Dark'
    TOO_BRIGHT = 'TOO_BRIGHT', 'Overexposed / Glare'
    LOW_RESOLUTION = 'LOW_RESOLUTION', 'Low Resolution'


class ReturnImage(models.Model):
    return_request = models.ForeignKey(ReturnRequest, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='returns/%Y/%m/')
    view_label = models.CharField(max_length=30, choices=ImageViewLabel.choices, default=ImageViewLabel.FRONT)
    image_quality_status = models.CharField(max_length=20, choices=ImageQualityStatus.choices, default=ImageQualityStatus.VALID)
    quality_score = models.FloatField(default=0.95)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image {self.id} for {self.return_request.return_id} ({self.view_label})"


class VisualConditionChoice(models.TextChoices):
    GOOD_OR_NO_VISIBLE_DAMAGE = 'GOOD_OR_NO_VISIBLE_DAMAGE', 'Good / No Visible Damage'
    SCRATCH_OR_SCUFF = 'SCRATCH_OR_SCUFF', 'Scratch or Surface Scuff'
    CRACK_OR_BREAK = 'CRACK_OR_BREAK', 'Crack or Broken Material'
    TEAR_OR_RIP = 'TEAR_OR_RIP', 'Tear, Hole, or Fabric Rip'
    STAIN_OR_CONTAMINATION = 'STAIN_OR_CONTAMINATION', 'Stain or Contamination'
    DEFORMATION = 'DEFORMATION', 'Structural Deformation / Bend'
    MISSING_OR_BROKEN_PART = 'MISSING_OR_BROKEN_PART', 'Missing or Broken Component'
    WATER_DAMAGE = 'WATER_DAMAGE', 'Water Damage / Corrosion'
    OTHER_VISIBLE_DEFECT = 'OTHER_VISIBLE_DEFECT', 'Other Visible Defect'
    UNCERTAIN_OR_UNSUPPORTED = 'UNCERTAIN_OR_UNSUPPORTED', 'Uncertain / Category Unsupported'


class AIInspection(models.Model):
    return_request = models.OneToOneField(ReturnRequest, on_delete=models.CASCADE, related_name='ai_inspection')
    model_name = models.CharField(max_length=100, default='MobileNetV3-Universal-Defect-v1.2')
    model_version = models.CharField(max_length=30, default='1.2.0')
    is_category_supported = models.BooleanField(default=True)
    overall_condition = models.CharField(max_length=40, choices=VisualConditionChoice.choices)
    confidence_score = models.FloatField(default=0.0)
    detected_defects = models.JSONField(default=list, help_text='List of detected defect objects with label, score, and box/details')
    image_evaluations = models.JSONField(default=list, help_text='Per-image analysis and quality metrics')
    requires_human_inspection = models.BooleanField(default=False)
    uncertainty_reason = models.TextField(blank=True)
    inspected_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI: {self.return_request.return_id} -> {self.overall_condition} ({self.confidence_score*100:.1f}%)"


class RecoveryRecommendation(models.Model):
    return_request = models.OneToOneField(ReturnRequest, on_delete=models.CASCADE, related_name='recommendation')
    recommended_action = models.CharField(max_length=20, choices=RecoveryOutcome.choices)
    confidence = models.FloatField(default=0.85)
    rationale = models.TextField(help_text='Explanation of decision logic based on category, damage, and rules')
    estimated_repair_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    estimated_resale_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    safety_alert = models.TextField(blank=True)
    rules_applied = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Recommendation: {self.return_request.return_id} -> {self.recommended_action}"


class RecoveryDecision(models.Model):
    return_request = models.OneToOneField(ReturnRequest, on_delete=models.CASCADE, related_name='decision')
    manager = models.ForeignKey(User, on_delete=models.PROTECT, related_name='managed_decisions')
    final_action = models.CharField(max_length=40)
    original_recommendation = models.CharField(max_length=40, blank=True)
    is_override = models.BooleanField(default=False)
    override_reason = models.TextField(blank=True)
    approval_reason = models.TextField(blank=True)
    manager_notes = models.TextField(blank=True)
    checklist_verification = models.JSONField(default=dict, blank=True)
    confirmed_defects = models.JSONField(default=list, blank=True)
    previous_status = models.CharField(max_length=40, blank=True)
    new_status = models.CharField(max_length=40, blank=True)
    decided_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Decision: {self.return_request.return_id} -> {self.final_action} by {self.manager.username}"


class RepairStatus(models.TextChoices):
    PENDING_ASSESSMENT = 'PENDING_ASSESSMENT', 'Pending Technical Assessment'
    IN_PROGRESS = 'IN_PROGRESS', 'Repair In Progress'
    PARTS_ORDERED = 'PARTS_ORDERED', 'Waiting for Replacement Parts'
    REPAIRED_TESTED = 'REPAIRED_TESTED', 'Repaired & Quality Tested'
    UNREPAIRABLE = 'UNREPAIRABLE', 'Declared Unrepairable'


class RepairRecord(models.Model):
    return_request = models.OneToOneField(ReturnRequest, on_delete=models.CASCADE, related_name='repair_record')
    technician_name = models.CharField(max_length=100, blank=True)
    repair_status = models.CharField(max_length=30, choices=RepairStatus.choices, default=RepairStatus.PENDING_ASSESSMENT)
    actual_repair_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    parts_replaced = models.TextField(blank=True)
    completion_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Repair for {self.return_request.return_id} ({self.repair_status})"


class InventoryTransactionType(models.TextChoices):
    RETURN_INTAKE = 'RETURN_INTAKE', 'Return Intake Received'
    RESTOCK_AVAILABLE = 'RESTOCK_AVAILABLE', 'Restocked to Available Inventory'
    RESALE_OUTLET = 'RESALE_OUTLET', 'Routed to Resale / Secondary Outlet'
    REPAIR_HOLD = 'REPAIR_HOLD', 'Hold for Repair Center'
    RECYCLE_DISPOSAL = 'RECYCLE_DISPOSAL', 'Transferred to Certified Recycler'


class InventoryTransaction(models.Model):
    return_request = models.ForeignKey(ReturnRequest, on_delete=models.CASCADE, related_name='inventory_transactions')
    transaction_type = models.CharField(max_length=30, choices=InventoryTransactionType.choices)
    sku = models.CharField(max_length=64)
    quantity = models.IntegerField(default=1)
    location = models.CharField(max_length=150, default='Main Intake Bay 1')
    notes = models.TextField(blank=True)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Tx: {self.sku} ({self.transaction_type}) at {self.location}"


class NotificationType(models.TextChoices):
    RETURN_STATUS = 'RETURN_STATUS', 'Return Status Update'
    ACTION_REQUIRED = 'ACTION_REQUIRED', 'Action Required'
    SAFETY_ALERT = 'SAFETY_ALERT', 'Safety Hazard Alert'
    SYSTEM = 'SYSTEM', 'System Notification'


class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    return_request = models.ForeignKey(ReturnRequest, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices, default=NotificationType.RETURN_STATUS)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.title}"


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp}] {self.user} - {self.action} on {self.entity_type} #{self.entity_id}"


class DatasetPlatform(models.TextChoices):
    MVTEC_OFFICIAL = 'MVTEC_OFFICIAL', 'MVTec AD Official Portal'
    VISA_OFFICIAL = 'VISA_OFFICIAL', 'VisA Official Research Portal'
    KAGGLE_API = 'KAGGLE_API', 'Kaggle Dataset API'
    HUGGINGFACE_HUB = 'HUGGINGFACE_HUB', 'Hugging Face Hub'
    DIRECT_URL = 'DIRECT_URL', 'Direct Authorized Dataset URL'


class DatasetStatus(models.TextChoices):
    NOT_CONFIGURED = 'NOT_CONFIGURED', 'Not Configured'
    READY_TO_DOWNLOAD = 'READY_TO_DOWNLOAD', 'Ready to Download'
    AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED', 'Authentication Required'
    AWAITING_USER_AUTHORIZATION = 'AWAITING_USER_AUTHORIZATION', 'Awaiting User Authorization'
    DOWNLOADING = 'DOWNLOADING', 'Downloading Archive'
    DOWNLOADED = 'DOWNLOADED', 'Downloaded & Extracted'
    VALIDATION_FAILED = 'VALIDATION_FAILED', 'Validation Failed'
    READY_FOR_TRAINING = 'READY_FOR_TRAINING', 'Ready for Model Training'
    RESTRICTED_BY_LICENSE = 'RESTRICTED_BY_LICENSE', 'Restricted by License (Non-Commercial)'


class DatasetSource(models.Model):
    name = models.CharField(max_length=150, unique=True)
    platform = models.CharField(max_length=40, choices=DatasetPlatform.choices)
    source_url = models.URLField(max_length=500)
    target_categories = models.JSONField(default=list, help_text='Covered catalog product categories')
    license_name = models.CharField(max_length=100)
    license_notes = models.TextField(blank=True)
    auth_required = models.BooleanField(default=False)
    auth_instructions = models.TextField(blank=True)
    download_status = models.CharField(max_length=40, choices=DatasetStatus.choices, default=DatasetStatus.NOT_CONFIGURED)
    download_progress = models.IntegerField(default=0)
    local_path = models.CharField(max_length=300, blank=True)
    archive_size_mb = models.FloatField(default=0.0)
    total_files = models.IntegerField(default=0)
    valid_images = models.IntegerField(default=0)
    corrupt_files = models.IntegerField(default=0)
    class_distribution = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.platform}) - {self.download_status}"
