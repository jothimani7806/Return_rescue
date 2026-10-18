import json
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password, is_password_usable
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from core.models import (
    UserProfile,
    UserRole,
    ProductCategory,
    Product,
    ReturnRequest,
    ReturnStatus,
    RecoveryOutcome,
    RecoveryDecision,
    AuditLog
)

class CustomerAuthenticationTests(TestCase):
    """
    Module 12.1: Automated Customer Authentication Tests
    """
    def setUp(self):
        self.client = APIClient()

    def test_customer_registration_workflow(self):
        # 1. Register a new customer
        reg_payload = {
            'username': 'john_doe',
            'email': 'john.doe@example.com',
            'password': 'SecurePassword@123',
            'first_name': 'John',
            'last_name': 'Doe'
        }
        res = self.client.post('/api/auth/register/', data=reg_payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertIn('token', res.data)
        self.assertIn('user', res.data)
        user_id = res.data['user']['id']

        # 2. Verify account exists in database
        user = User.objects.filter(username='john_doe').first()
        self.assertIsNotNone(user)
        self.assertEqual(user.email, 'john.doe@example.com')
        self.assertEqual(user.first_name, 'John')
        self.assertEqual(user.last_name, 'Doe')
        self.assertEqual(user.profile.role, UserRole.CUSTOMER)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

        # 3. Verify password is secure & hashed (never stored in plaintext)
        self.assertNotEqual(user.password, 'SecurePassword@123')
        self.assertTrue(check_password('SecurePassword@123', user.password))
        self.assertTrue(is_password_usable(user.password))

        # 4. Log in with registered credentials (username)
        login_res = self.client.post('/api/auth/login/', data={
            'username': 'john_doe',
            'password': 'SecurePassword@123'
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        token_1 = login_res.data['token']
        self.assertEqual(login_res.data['user']['id'], user_id)

        # 5. Log out
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token_1}')
        logout_res = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # 6. Log in again with the same credentials
        self.client.credentials()  # Clear auth header
        login_res_2 = self.client.post('/api/auth/login/', data={
            'username': 'john_doe',
            'password': 'SecurePassword@123'
        })
        self.assertEqual(login_res_2.status_code, status.HTTP_200_OK)

        # 7. Verify the same account ID is used permanently
        self.assertEqual(login_res_2.data['user']['id'], user_id)

        # Also test email login
        login_email_res = self.client.post('/api/auth/login/', data={
            'username': 'john.doe@example.com',
            'password': 'SecurePassword@123'
        })
        self.assertEqual(login_email_res.status_code, status.HTTP_200_OK)
        self.assertEqual(login_email_res.data['user']['id'], user_id)

        # 8. Verify incorrect password is rejected
        bad_pass_res = self.client.post('/api/auth/login/', data={
            'username': 'john_doe',
            'password': 'WrongPassword@999'
        })
        self.assertEqual(bad_pass_res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', bad_pass_res.data)

        # 9. Verify duplicate registration is rejected appropriately
        dup_username_res = self.client.post('/api/auth/register/', data={
            'username': 'john_doe',
            'email': 'different.email@example.com',
            'password': 'AnotherPassword@123'
        })
        self.assertEqual(dup_username_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', dup_username_res.data['error'].lower())

        dup_email_res = self.client.post('/api/auth/register/', data={
            'username': 'different_username',
            'email': 'john.doe@example.com',
            'password': 'AnotherPassword@123'
        })
        self.assertEqual(dup_email_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email address already exists', dup_email_res.data['error'].lower())


class CustomerPersistenceTests(TestCase):
    """
    Module 12.2: Automated Customer Persistence Tests
    """
    def setUp(self):
        self.client = APIClient()

        # Create category
        self.category = ProductCategory.objects.create(
            name='Consumer Electronics',
            slug='consumer-electronics',
            description='Gadgets and devices',
            is_active=True,
            is_ai_supported=True
        )

        # Create product
        self.product = Product.objects.create(
            sku='ELEC-DEV-001',
            name='Noise Cancelling Headphones',
            category=self.category,
            retail_price=Decimal('199.99'),
            expected_salvage_value=Decimal('80.00'),
            resale_eligible=True
        )

        # Create Customer A
        self.user_a = User.objects.create_user(
            username='customer_a',
            email='customer.a@example.com',
            password='PasswordA@123',
            first_name='Customer',
            last_name='A'
        )
        UserProfile.objects.create(user=self.user_a, role=UserRole.CUSTOMER)
        self.token_a, _ = Token.objects.get_or_create(user=self.user_a)

    def test_customer_return_submission_and_history_persistence(self):
        # 1. Log in as Customer A
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')

        # 2. Submit multiple return requests
        ret1_res = self.client.post('/api/returns/', data={
            'product_name': 'Noise Cancelling Headphones',
            'sku': 'ELEC-DEV-001',
            'category_slug': 'consumer-electronics',
            'return_reason': 'DEFECTIVE_OR_DAMAGED',
            'customer_description': 'Left earcup crackles occasionally during audio playback.',
            'is_functional': 'true',
            'packaging_condition': 'ORIGINAL_OPENED'
        })
        self.assertEqual(ret1_res.status_code, status.HTTP_201_CREATED, ret1_res.data)
        ret1_id = ret1_res.data['return_id']
        ret1_pk = ret1_res.data['id']

        ret2_res = self.client.post('/api/returns/', data={
            'product_name': 'Noise Cancelling Headphones - Replacement',
            'sku': 'ELEC-DEV-001',
            'category_slug': 'consumer-electronics',
            'return_reason': 'CHANGED_MIND',
            'customer_description': 'No longer required.',
            'is_functional': 'true',
            'packaging_condition': 'ORIGINAL_SEALED'
        })
        self.assertEqual(ret2_res.status_code, status.HTTP_201_CREATED, ret2_res.data)
        ret2_id = ret2_res.data['return_id']

        # 3. Verify they exist in the database with customer foreign key relationship
        self.assertEqual(ReturnRequest.objects.filter(customer=self.user_a).count(), 2)
        r1_db = ReturnRequest.objects.get(id=ret1_pk)
        self.assertEqual(r1_db.customer, self.user_a)
        self.assertEqual(r1_db.return_id, ret1_id)
        self.assertEqual(r1_db.category, self.category)

        # 4. Log out
        self.client.post('/api/auth/logout/')
        self.client.credentials()  # Clear auth header

        # 5. Log back in
        login_res = self.client.post('/api/auth/login/', data={
            'username': 'customer_a',
            'password': 'PasswordA@123'
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        new_token = login_res.data['token']

        # 6. Retrieve customer's return history
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {new_token}')
        history_res = self.client.get('/api/returns/')
        self.assertEqual(history_res.status_code, status.HTTP_200_OK)
        records = history_res.data if isinstance(history_res.data, list) else history_res.data.get('results', [])

        # 7. Verify all original requests are present
        returned_ids = [r['return_id'] for r in records]
        self.assertIn(ret1_id, returned_ids)
        self.assertIn(ret2_id, returned_ids)
        self.assertEqual(len(records), 2)

        # 8. Retrieve specific detail view
        detail_res = self.client.get(f'/api/returns/{ret1_pk}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['return_id'], ret1_id)
        self.assertEqual(detail_res.data['customer_username'], 'customer_a')


class ManagerPersistenceTests(TestCase):
    """
    Module 12.3: Automated Manager Persistence & Role Isolation Tests
    """
    def setUp(self):
        self.client = APIClient()

        # Category
        self.category = ProductCategory.objects.create(
            name='Fashion Apparel',
            slug='fashion-apparel',
            description='Clothing and fashion garments',
            is_active=True,
            is_ai_supported=True
        )

        # Manager user
        self.manager = User.objects.create_user(
            username='manager_user',
            email='manager@returnrescue.io',
            password='ManagerPass@123',
            first_name='Operations',
            last_name='Lead',
            is_staff=True
        )
        UserProfile.objects.create(user=self.manager, role=UserRole.MANAGER, department='Return Logistics')
        self.manager_token, _ = Token.objects.get_or_create(user=self.manager)

        # Customer A
        self.cust_a = User.objects.create_user(
            username='cust_alice',
            email='alice@example.com',
            password='AlicePass@123',
            first_name='Alice'
        )
        UserProfile.objects.create(user=self.cust_a, role=UserRole.CUSTOMER)
        self.token_a, _ = Token.objects.get_or_create(user=self.cust_a)

        # Customer B
        self.cust_b = User.objects.create_user(
            username='cust_bob',
            email='bob@example.com',
            password='BobPass@123',
            first_name='Bob'
        )
        UserProfile.objects.create(user=self.cust_b, role=UserRole.CUSTOMER)
        self.token_b, _ = Token.objects.get_or_create(user=self.cust_b)

    def test_multi_customer_manager_queue_and_isolation(self):
        # 1. Customer A submits return request
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        res_a = self.client.post('/api/returns/', data={
            'product_name': 'Cashmere Wool Sweater',
            'category_slug': 'fashion-apparel',
            'return_reason': 'SIZE_OR_FIT_ISSUE',
            'customer_description': 'Size Medium fits like a Small.',
            'is_functional': 'true',
            'packaging_condition': 'ORIGINAL_OPENED'
        })
        self.assertEqual(res_a.status_code, status.HTTP_201_CREATED)
        ret_a_pk = res_a.data['id']
        ret_a_id = res_a.data['return_id']

        # 2. Customer B submits return request
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_b.key}')
        res_b = self.client.post('/api/returns/', data={
            'product_name': 'Denim Jacket',
            'category_slug': 'fashion-apparel',
            'return_reason': 'DEFECTIVE_OR_DAMAGED',
            'customer_description': 'Missing copper button on right pocket.',
            'is_functional': 'true',
            'packaging_condition': 'NO_PACKAGING'
        })
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)
        ret_b_pk = res_b.data['id']
        ret_b_id = res_b.data['return_id']

        # 3. Customer A cannot access Customer B's private request
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        unauthorized_detail = self.client.get(f'/api/returns/{ret_b_pk}/')
        self.assertEqual(unauthorized_detail.status_code, status.HTTP_404_NOT_FOUND)

        # 4. Customer A only sees Customer A's own return in queue
        cust_a_list = self.client.get('/api/returns/')
        cust_a_records = cust_a_list.data if isinstance(cust_a_list.data, list) else cust_a_list.data.get('results', [])
        self.assertEqual(len(cust_a_records), 1)
        self.assertEqual(cust_a_records[0]['return_id'], ret_a_id)

        # 5. Customer cannot access Manager-only APIs
        unauth_metrics = self.client.get('/api/metrics/dashboard/')
        self.assertEqual(unauth_metrics.status_code, status.HTTP_403_FORBIDDEN)

        unauth_customers = self.client.get('/api/customers/')
        self.assertEqual(unauth_customers.status_code, status.HTTP_403_FORBIDDEN)

        # 6. Customer cannot delete return request
        unauth_delete = self.client.delete(f'/api/returns/{ret_a_pk}/')
        self.assertEqual(unauth_delete.status_code, status.HTTP_403_FORBIDDEN)

        # 7. Log in as Manager and retrieve all return requests
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.manager_token.key}')
        mgr_returns_res = self.client.get('/api/returns/')
        self.assertEqual(mgr_returns_res.status_code, status.HTTP_200_OK)
        mgr_records = mgr_returns_res.data if isinstance(mgr_returns_res.data, list) else mgr_returns_res.data.get('results', [])
        
        # Manager can see requests from both customers
        mgr_return_ids = [r['return_id'] for r in mgr_records]
        self.assertIn(ret_a_id, mgr_return_ids)
        self.assertIn(ret_b_id, mgr_return_ids)

        # Verify correct customer association
        rec_a = next(r for r in mgr_records if r['return_id'] == ret_a_id)
        self.assertEqual(rec_a['customer_username'], 'cust_alice')

        rec_b = next(r for r in mgr_records if r['return_id'] == ret_b_id)
        self.assertEqual(rec_b['customer_username'], 'cust_bob')

        # 8. Manager updates review decision (Approve / Override / Status change)
        decision_res = self.client.post(f'/api/returns/{ret_a_pk}/approve_decision/', data={
            'action_type': 'APPROVE',
            'final_action': RecoveryOutcome.RESTOCK,
            'approval_reason': 'Garment in perfect condition with original packaging.',
            'manager_notes': 'Sent to central warehouse prime bin.'
        }, format='json')
        self.assertEqual(decision_res.status_code, status.HTTP_200_OK)
        self.assertEqual(decision_res.data['final_recovery_outcome'], RecoveryOutcome.RESTOCK)
        self.assertEqual(decision_res.data['status'], ReturnStatus.RESTOCKED)

        # 9. Verify decision persisted in database
        refetched = self.client.get(f'/api/returns/{ret_a_pk}/')
        self.assertEqual(refetched.status_code, status.HTTP_200_OK)
        self.assertEqual(refetched.data['final_recovery_outcome'], RecoveryOutcome.RESTOCK)
        self.assertEqual(refetched.data['status'], ReturnStatus.RESTOCKED)
        self.assertIsNotNone(refetched.data.get('decision'))
        self.assertEqual(refetched.data['decision']['final_action'], RecoveryOutcome.RESTOCK)

        # 10. Manager lists customers endpoint
        cust_list_res = self.client.get('/api/customers/')
        self.assertEqual(cust_list_res.status_code, status.HTTP_200_OK)
        cust_usernames = [c['username'] for c in cust_list_res.data]
        self.assertIn('cust_alice', cust_usernames)
        self.assertIn('cust_bob', cust_usernames)

        # Verify passwords and hashes are never exposed in customer list
        for c in cust_list_res.data:
            self.assertNotIn('password', c)
            self.assertNotIn('password_hash', c)

        # 11. Manager deactivates Customer B
        toggle_res = self.client.post(f'/api/customers/{self.cust_b.id}/toggle-status/')
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.assertFalse(toggle_res.data['is_active'])

        # Verify Customer B cannot log in while deactivated
        self.client.credentials()  # Clear auth
        deactivated_login = self.client.post('/api/auth/login/', data={
            'username': 'cust_bob',
            'password': 'BobPass@123'
        })
        self.assertEqual(deactivated_login.status_code, status.HTTP_403_FORBIDDEN)

        # Verify Customer B's historical return requests STILL EXIST in database!
        self.assertTrue(ReturnRequest.objects.filter(id=ret_b_pk).exists())

        # 12. Manager executes authorized deletion of Return A
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.manager_token.key}')
        del_res = self.client.delete(f'/api/returns/{ret_a_pk}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)

        # Verify Return A is deleted from DB
        self.assertFalse(ReturnRequest.objects.filter(id=ret_a_pk).exists())

        # Verify Audit Log entry created for the deletion
        audit_entry = AuditLog.objects.filter(action='RETURN_RECORD_DELETED', entity_id=str(ret_a_pk)).first()
        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.user, self.manager)
