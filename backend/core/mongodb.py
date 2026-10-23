"""
MongoDB Atlas Persistent Data Layer for Return Rescue
Manages connection pooling, collection indexing, CRUD operations,
and synchronization between MongoDB Atlas and backend models.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import pymongo
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from django.conf import settings

logger = logging.getLogger('return_rescue.mongodb')

class MongoDBManager:
    _instance: Optional['MongoDBManager'] = None
    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDBManager, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        # Load from environment variables (backend/.env or system env)
        uri = os.environ.get('MONGODB_URI', '').strip()
        # Fallback check inside settings or dotenv
        if not uri and hasattr(settings, 'MONGODB_URI'):
            uri = getattr(settings, 'MONGODB_URI', '').strip()

        db_name = os.environ.get('MONGODB_DATABASE', 'return_rescue').strip()

        if not uri:
            logger.warning("[MongoDB] MONGODB_URI is not set. Cloud persistence will be disabled until configured.")
            self._client = None
            self._db = None
            return

        try:
            # Singleton MongoClient with connection pooling & reasonable timeouts
            self._client = MongoClient(
                uri,
                maxPoolSize=50,
                minPoolSize=5,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                socketTimeoutMS=20000,
                retryWrites=True,
                w='majority'
            )
            self._db = self._client[db_name]
            # Quick connectivity check
            self._client.admin.command('ping')
            logger.info(f"[MongoDB] Successfully connected to MongoDB Atlas database: '{db_name}'")
            self._ensure_indexes()
        except Exception as e:
            logger.error(f"[MongoDB] Connection to MongoDB Atlas failed: {e}")
            self._client = None
            self._db = None

    def _ensure_indexes(self):
        """Create required unique and query indexes for collections."""
        if self._db is None:
            return
        try:
            # 1. users collection: unique username & email
            users_col = self._db['users']
            users_col.create_index([('username', pymongo.ASCENDING)], unique=True)
            users_col.create_index([('email', pymongo.ASCENDING)], unique=True, sparse=True)
            users_col.create_index([('role', pymongo.ASCENDING)])

            # 2. customer_records collection (returns): unique return_id
            records_col = self._db['customer_records']
            records_col.create_index([('return_id', pymongo.ASCENDING)], unique=True)
            records_col.create_index([('customer_username', pymongo.ASCENDING)])
            records_col.create_index([('status', pymongo.ASCENDING)])
            records_col.create_index([('created_at', pymongo.DESCENDING)])

            # 3. product_categories collection: unique slug
            cat_col = self._db['product_categories']
            cat_col.create_index([('slug', pymongo.ASCENDING)], unique=True)

            # 4. products collection: unique sku
            prod_col = self._db['products']
            prod_col.create_index([('sku', pymongo.ASCENDING)], unique=True)

            # 5. audit_logs collection: timestamp index
            audit_col = self._db['audit_logs']
            audit_col.create_index([('timestamp', pymongo.DESCENDING)])

            logger.info("[MongoDB] Verified and initialized all collection indexes.")
        except Exception as e:
            logger.warning(f"[MongoDB] Error setting up indexes: {e}")

    @property
    def is_connected(self) -> bool:
        if self._client is None or self._db is None:
            return False
        try:
            self._client.admin.command('ping')
            return True
        except Exception:
            return False

    @property
    def db(self) -> Optional[Database]:
        return self._db

    def get_collection(self, name: str) -> Optional[Collection]:
        if self._db is not None:
            return self._db[name]
        return None


# Global singleton instance
mongodb_manager = MongoDBManager()

def get_mongodb() -> Optional[Database]:
    return mongodb_manager.db


# ==========================================================
# REUSABLE CRUD OPERATIONS FOR CUSTOMER DATA & MANAGEMENT
# ==========================================================

def save_customer_record_to_mongodb(return_obj) -> bool:
    """
    Saves or updates a customer return record in MongoDB Atlas 'customer_records' collection.
    Guarantees persistence across server restarts and container recreations.
    """
    col = mongodb_manager.get_collection('customer_records')
    if col is None:
        return False

    try:
        # Extract AI inspection data if present
        ai_data = None
        if hasattr(return_obj, 'ai_inspection') and return_obj.ai_inspection:
            insp = return_obj.ai_inspection
            ai_data = {
                'model_name': insp.model_name,
                'overall_condition': insp.overall_condition,
                'confidence_score': float(insp.confidence_score),
                'detected_defects': insp.detected_defects,
                'requires_human_inspection': insp.requires_human_inspection,
                'uncertainty_reason': insp.uncertainty_reason
            }

        # Extract Recommendation if present
        rec_data = None
        if hasattr(return_obj, 'recommendation') and return_obj.recommendation:
            rec = return_obj.recommendation
            rec_data = {
                'recommended_action': rec.recommended_action,
                'confidence': float(rec.confidence),
                'rationale': rec.rationale,
                'estimated_repair_cost': float(rec.estimated_repair_cost),
                'estimated_resale_value': float(rec.estimated_resale_value)
            }

        # Extract Manager Decision if present
        decision_data = None
        if hasattr(return_obj, 'decision') and return_obj.decision:
            dec = return_obj.decision
            decision_data = {
                'manager_username': dec.manager.username if dec.manager else 'manager',
                'final_action': dec.final_action,
                'is_override': dec.is_override,
                'override_reason': dec.override_reason,
                'manager_notes': dec.manager_notes,
                'decided_at': dec.decided_at.isoformat() if dec.decided_at else datetime.now(timezone.utc).isoformat()
            }

        doc = {
            'return_id': return_obj.return_id,
            'django_id': return_obj.id,
            'customer_username': return_obj.customer.username,
            'customer_email': return_obj.customer.email,
            'customer_id': return_obj.customer.id,
            'sku': return_obj.sku or '',
            'product_name': return_obj.product_name,
            'category_slug': return_obj.category.slug if return_obj.category else '',
            'category_name': return_obj.category.name if return_obj.category else '',
            'return_reason': return_obj.return_reason,
            'customer_description': return_obj.customer_description,
            'condition_answers': return_obj.condition_answers or {},
            'is_functional': bool(return_obj.is_functional),
            'packaging_condition': return_obj.packaging_condition,
            'missing_accessories': return_obj.missing_accessories or [],
            'status': return_obj.status,
            'final_recovery_outcome': return_obj.final_recovery_outcome or None,
            'ai_inspection': ai_data,
            'recommendation': rec_data,
            'decision': decision_data,
            'created_at': return_obj.created_at.isoformat() if return_obj.created_at else datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }

        col.replace_one({'return_id': return_obj.return_id}, doc, upsert=True)
        logger.info(f"[MongoDB] Saved return request '{return_obj.return_id}' to MongoDB Atlas.")
        return True
    except Exception as e:
        logger.error(f"[MongoDB] Failed to save return '{return_obj.return_id}' to MongoDB: {e}")
        return False


def delete_customer_record_from_mongodb(return_id: str) -> bool:
    """Deletes a customer return record from MongoDB Atlas 'customer_records' collection."""
    col = mongodb_manager.get_collection('customer_records')
    if col is None:
        return False
    try:
        res = col.delete_one({'return_id': return_id})
        logger.info(f"[MongoDB] Deleted return request '{return_id}' from MongoDB (deleted_count={res.deleted_count}).")
        return res.deleted_count > 0
    except Exception as e:
        logger.error(f"[MongoDB] Failed to delete return '{return_id}': {e}")
        return False


def save_user_to_mongodb(user_obj, role='CUSTOMER') -> bool:
    """Saves or updates a user profile to MongoDB Atlas 'users' collection."""
    col = mongodb_manager.get_collection('users')
    if col is None:
        return False
    try:
        user_doc = {
            'django_id': user_obj.id,
            'username': user_obj.username,
            'email': user_obj.email or '',
            'password_hash': user_obj.password,
            'first_name': user_obj.first_name or '',
            'last_name': user_obj.last_name or '',
            'role': role,
            'is_active': user_obj.is_active,
            'is_staff': user_obj.is_staff,
            'is_superuser': user_obj.is_superuser,
            'date_joined': user_obj.date_joined.isoformat() if user_obj.date_joined else datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        col.replace_one({'username': user_obj.username}, user_doc, upsert=True)
        return True
    except Exception as e:
        logger.error(f"[MongoDB] Failed to save user '{user_obj.username}' to MongoDB: {e}")
        return False


def log_audit_to_mongodb(user, action: str, entity_type: str, entity_id: str, details: dict = None) -> bool:
    """Logs an audit entry to MongoDB Atlas 'audit_logs' collection."""
    col = mongodb_manager.get_collection('audit_logs')
    if col is None:
        return False
    try:
        entry = {
            'username': user.username if user else 'anonymous',
            'user_id': user.id if user else None,
            'action': action,
            'entity_type': entity_type,
            'entity_id': str(entity_id),
            'details': details or {},
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        col.insert_one(entry)
        return True
    except Exception as e:
        logger.error(f"[MongoDB] Failed to save audit log to MongoDB: {e}")
        return False


def restore_records_from_mongodb_if_needed():
    """
    Automatic Cloud Sync / Resilience Guard:
    If running on an ephemeral cloud host (e.g. Render restart/re-deploy) where the local
    database was wiped or is empty, this restores users, return requests, categories,
    and decisions directly from MongoDB Atlas into Django.
    """
    col = mongodb_manager.get_collection('customer_records')
    if col is None:
        return

    try:
        from django.contrib.auth.models import User
        from core.models import (
            UserProfile, UserRole, ProductCategory, ReturnRequest,
            AIInspection, RecoveryRecommendation, RecoveryDecision
        )

        mongo_count = col.count_documents({})
        django_count = ReturnRequest.objects.count()

        if mongo_count > django_count:
            logger.info(f"[MongoDB Sync] Detected {mongo_count} records in MongoDB vs {django_count} in local DB. Restoring...")
            # Restore users first
            users_col = mongodb_manager.get_collection('users')
            if users_col:
                for udoc in users_col.find({}):
                    u, created = User.objects.get_or_create(username=udoc['username'], defaults={
                        'email': udoc.get('email', ''),
                        'first_name': udoc.get('first_name', ''),
                        'last_name': udoc.get('last_name', ''),
                        'password': udoc.get('password_hash', ''),
                        'is_active': udoc.get('is_active', True),
                        'is_staff': udoc.get('is_staff', False),
                        'is_superuser': udoc.get('is_superuser', False)
                    })
                    UserProfile.objects.get_or_create(user=u, defaults={
                        'role': udoc.get('role', UserRole.CUSTOMER)
                    })

            # Restore returns
            for rdoc in col.find({}):
                ret_id = rdoc['return_id']
                if ReturnRequest.objects.filter(return_id=ret_id).exists():
                    continue

                customer_user = User.objects.filter(username=rdoc['customer_username']).first()
                if not customer_user:
                    customer_user = User.objects.create_user(
                        username=rdoc['customer_username'],
                        email=rdoc.get('customer_email', f"{rdoc['customer_username']}@example.com")
                    )
                    UserProfile.objects.get_or_create(user=customer_user, role=UserRole.CUSTOMER)

                category = ProductCategory.objects.filter(slug=rdoc.get('category_slug')).first()
                if not category and rdoc.get('category_slug'):
                    category = ProductCategory.objects.create(
                        name=rdoc.get('category_name', rdoc['category_slug'].replace('-', ' ').title()),
                        slug=rdoc['category_slug']
                    )

                new_ret = ReturnRequest(
                    return_id=ret_id,
                    customer=customer_user,
                    product_name=rdoc.get('product_name', 'Product'),
                    sku=rdoc.get('sku', ''),
                    category=category,
                    return_reason=rdoc.get('return_reason', 'DEFECTIVE_OR_DAMAGED'),
                    customer_description=rdoc.get('customer_description', ''),
                    condition_answers=rdoc.get('condition_answers', {}),
                    is_functional=rdoc.get('is_functional', True),
                    packaging_condition=rdoc.get('packaging_condition', 'ORIGINAL_OPENED'),
                    missing_accessories=rdoc.get('missing_accessories', []),
                    status=rdoc.get('status', 'SUBMITTED'),
                    final_recovery_outcome=rdoc.get('final_recovery_outcome', None)
                )
                new_ret.save()

                # Restore AI inspection if stored
                ai_doc = rdoc.get('ai_inspection')
                if ai_doc:
                    AIInspection.objects.get_or_create(
                        return_request=new_ret,
                        defaults={
                            'model_name': ai_doc.get('model_name', 'MobileNetV3-Universal-Defect-v1.2'),
                            'overall_condition': ai_doc.get('overall_condition', 'GOOD_OR_NO_VISIBLE_DAMAGE'),
                            'confidence_score': ai_doc.get('confidence_score', 0.9),
                            'detected_defects': ai_doc.get('detected_defects', []),
                            'requires_human_inspection': ai_doc.get('requires_human_inspection', False),
                            'uncertainty_reason': ai_doc.get('uncertainty_reason', '')
                        }
                    )

                # Restore Recommendation
                rec_doc = rdoc.get('recommendation')
                if rec_doc:
                    RecoveryRecommendation.objects.get_or_create(
                        return_request=new_ret,
                        defaults={
                            'recommended_action': rec_doc.get('recommended_action', 'RESTOCK'),
                            'confidence': rec_doc.get('confidence', 0.85),
                            'rationale': rec_doc.get('rationale', ''),
                            'estimated_repair_cost': rec_doc.get('estimated_repair_cost', 0.0),
                            'estimated_resale_value': rec_doc.get('estimated_resale_value', 0.0)
                        }
                    )

                # Restore Decision
                dec_doc = rdoc.get('decision')
                if dec_doc:
                    mgr_user = User.objects.filter(username=dec_doc.get('manager_username', 'manager')).first()
                    if not mgr_user:
                        mgr_user = User.objects.filter(is_staff=True).first() or customer_user
                    RecoveryDecision.objects.get_or_create(
                        return_request=new_ret,
                        defaults={
                            'manager': mgr_user,
                            'final_action': dec_doc.get('final_action', 'RESTOCK'),
                            'is_override': dec_doc.get('is_override', False),
                            'override_reason': dec_doc.get('override_reason', ''),
                            'manager_notes': dec_doc.get('manager_notes', '')
                        }
                    )
            logger.info(f"[MongoDB Sync] Successfully restored {mongo_count} records from MongoDB Atlas.")
    except Exception as e:
        logger.error(f"[MongoDB Sync] Error during restore: {e}")
