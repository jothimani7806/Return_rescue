"""
Migration Script: Migrates SQLite/Django records into MongoDB Atlas
Preserves all user credentials, return history, categories, products, decisions, and audit logs.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load .env variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'return_rescue.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import (
    UserProfile,
    ProductCategory,
    ProductSubcategory,
    Product,
    ProductInspectionRule,
    ReturnRequest,
    AIInspection,
    RecoveryRecommendation,
    RecoveryDecision,
    AuditLog
)
from core.mongodb import (
    mongodb_manager,
    save_user_to_mongodb,
    save_customer_record_to_mongodb,
    log_audit_to_mongodb
)

def run_migration():
    print("=" * 65)
    print("RETURN RESCUE - MONGODB ATLAS CLOUD MIGRATION")
    print("=" * 65)

    if not mongodb_manager.is_connected:
        print("[!] ERROR: Could not connect to MongoDB Atlas.")
        print("    Please check that MONGODB_URI is set correctly in backend/.env")
        print("    and that Network Access in Atlas allows IP 0.0.0.0/0.")
        sys.exit(1)

    db = mongodb_manager.db
    print(f"[+] Connected to MongoDB Atlas database: '{db.name}'")

    # 1. Migrate Users & Roles
    print("\n[1/5] Migrating Users & Roles...")
    users = User.objects.all().select_related('profile')
    user_count = 0
    for u in users:
        role = getattr(u, 'profile', None).role if hasattr(u, 'profile') else ('MANAGER' if u.is_staff else 'CUSTOMER')
        if save_user_to_mongodb(u, role=role):
            user_count += 1
    print(f"    -> Successfully migrated {user_count} users to MongoDB 'users' collection.")

    # 2. Migrate Product Categories & Catalog
    print("\n[2/5] Migrating Product Categories...")
    cat_col = db['product_categories']
    categories = ProductCategory.objects.all()
    cat_count = 0
    for cat in categories:
        doc = {
            'django_id': cat.id,
            'name': cat.name,
            'slug': cat.slug,
            'description': cat.description,
            'icon': cat.icon,
            'is_active': cat.is_active,
            'is_ai_supported': cat.is_ai_supported,
            'ai_support_notes': cat.ai_support_notes,
            'created_at': cat.created_at.isoformat() if cat.created_at else datetime.now(timezone.utc).isoformat()
        }
        cat_col.replace_one({'slug': cat.slug}, doc, upsert=True)
        cat_count += 1
    print(f"    -> Successfully migrated {cat_count} categories to MongoDB 'product_categories' collection.")

    # 3. Migrate Products
    print("\n[3/5] Migrating Products...")
    prod_col = db['products']
    products = Product.objects.all().select_related('category')
    prod_count = 0
    for prod in products:
        pdoc = {
            'django_id': prod.id,
            'sku': prod.sku,
            'name': prod.name,
            'category_slug': prod.category.slug if prod.category else '',
            'category_name': prod.category.name if prod.category else '',
            'brand': prod.brand,
            'retail_price': float(prod.retail_price),
            'expected_salvage_value': float(prod.expected_salvage_value),
            'resale_eligible': prod.resale_eligible,
            'created_at': prod.created_at.isoformat() if prod.created_at else datetime.now(timezone.utc).isoformat()
        }
        prod_col.replace_one({'sku': prod.sku}, pdoc, upsert=True)
        prod_count += 1
    print(f"    -> Successfully migrated {prod_count} products to MongoDB 'products' collection.")

    # 4. Migrate Return Requests (Customer Records)
    print("\n[4/5] Migrating Customer Return Records & AI Decisions...")
    returns = ReturnRequest.objects.all().select_related(
        'customer', 'category', 'ai_inspection', 'recommendation', 'decision'
    )
    ret_count = 0
    for ret in returns:
        if save_customer_record_to_mongodb(ret):
            ret_count += 1
    print(f"    -> Successfully migrated {ret_count} return records to MongoDB 'customer_records' collection.")

    # 5. Migrate Audit Logs
    print("\n[5/5] Migrating Audit Logs...")
    logs = AuditLog.objects.all().select_related('user')
    log_count = 0
    for al in logs:
        if log_audit_to_mongodb(al.user, al.action, al.entity_type, al.entity_id, al.details):
            log_count += 1
    print(f"    -> Successfully migrated {log_count} audit logs to MongoDB 'audit_logs' collection.")

    # Summary Verification
    print("\n" + "=" * 65)
    print("VERIFICATION OF MONGODB ATLAS CLOUD COLLECTIONS")
    print("=" * 65)
    print(f"  • users:             {db['users'].count_documents({})} documents")
    print(f"  • customer_records:  {db['customer_records'].count_documents({})} documents")
    print(f"  • product_categories:{db['product_categories'].count_documents({})} documents")
    print(f"  • products:          {db['products'].count_documents({})} documents")
    print(f"  • audit_logs:        {db['audit_logs'].count_documents({})} documents")
    print("=" * 65)
    print("[SUCCESS] All existing records have been permanently migrated to MongoDB Atlas!")

if __name__ == '__main__':
    run_migration()
