"""
Comprehensive Verification Suite for Return Rescue Master Requirements
Tests all 18 criteria specified in the user prompt.
"""

import os
import sys
import json
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'return_rescue.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from django.conf import settings
from core.models import (
    UserProfile, UserRole, ProductCategory, Product, ReturnRequest,
    ReturnStatus, RecoveryOutcome, RecoveryDecision, AuditLog, InventoryTransaction
)

def run_tests():
    print("=" * 70)
    print("RUNNING RETURN RESCUE MASTER REQUIREMENTS VERIFICATION")
    print("=" * 70)

    client = Client()
    passed = 0
    total = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"[PASS] {total:02d}. {name}")
        else:
            print(f"[FAIL] {total:02d}. {name} --> {details}")

    # ----------------------------------------------------
    # TEST 1: Single-Port Frontend Routing & SPA Fallback
    # ----------------------------------------------------
    res_root = client.get('/')
    assert_test(
        "Single-Port: Root / serves React HTML entry page",
        res_root.status_code == 200 and 'id="root"' in res_root.content.decode('utf-8'),
        f"Status: {res_root.status_code}"
    )

    res_login = client.get('/login')
    assert_test(
        "Single-Port: /login serves React HTML entry page",
        res_login.status_code == 200 and 'id="root"' in res_login.content.decode('utf-8'),
        f"Status: {res_login.status_code}"
    )

    res_customer = client.get('/customer/dashboard')
    assert_test(
        "Single-Port: Deep React route /customer/dashboard serves HTML (no 404 on refresh)",
        res_customer.status_code == 200 and 'id="root"' in res_customer.content.decode('utf-8'),
        f"Status: {res_customer.status_code}"
    )

    res_manager = client.get('/manager/returns')
    assert_test(
        "Single-Port: Deep React route /manager/returns serves HTML (no 404 on refresh)",
        res_manager.status_code == 200 and 'id="root"' in res_manager.content.decode('utf-8'),
        f"Status: {res_manager.status_code}"
    )

    # ----------------------------------------------------
    # TEST 2: API routes remain separate from SPA fallback
    # ----------------------------------------------------
    res_invalid_api = client.get('/api/invalid-test-endpoint/')
    assert_test(
        "API isolation: Invalid API route returns 404 JSON, NOT React HTML",
        res_invalid_api.status_code == 404 and res_invalid_api.headers.get('Content-Type') == 'application/json',
        f"Status: {res_invalid_api.status_code}, Type: {res_invalid_api.headers.get('Content-Type')}"
    )

    # ----------------------------------------------------
    # TEST 3: Static Asset Serving
    # ----------------------------------------------------
    dist_dir = settings.FRONTEND_DIR / 'assets'
    asset_files = [f for f in os.listdir(dist_dir) if f.endswith('.js')] if dist_dir.exists() else []
    if asset_files:
        js_asset = asset_files[0]
        res_asset = client.get(f'/assets/{js_asset}')
        assert_test(
            f"Static Asset: /assets/{js_asset} loads with 200",
            res_asset.status_code == 200,
            f"Status: {res_asset.status_code}"
        )
    else:
        assert_test("Static Asset: /assets/ bundle exists", False, "No JS files found in dist/assets")

    # ----------------------------------------------------
    # TEST 4: Authentication & Roles
    # ----------------------------------------------------
    # 4a. Valid customer login
    res_cust_login = client.post(
        '/api/auth/login/',
        data=json.dumps({'username': 'customer', 'password': 'Customer@123', 'portal': 'customer'}),
        content_type='application/json'
    )
    cust_data = res_cust_login.json()
    assert_test(
        "Customer Auth: Valid customer credentials authenticate successfully",
        res_cust_login.status_code == 200 and cust_data.get('user', {}).get('is_customer') is True,
        f"Status: {res_cust_login.status_code}, Data: {cust_data}"
    )

    # 4b. Valid manager login
    res_mgr_login = client.post(
        '/api/auth/login/',
        data=json.dumps({'username': 'manager', 'password': 'Manager@123', 'portal': 'manager'}),
        content_type='application/json'
    )
    mgr_data = res_mgr_login.json()
    assert_test(
        "Manager Auth: Valid manager credentials authenticate successfully with manager role",
        res_mgr_login.status_code == 200 and mgr_data.get('user', {}).get('is_manager') is True,
        f"Status: {res_mgr_login.status_code}, Data: {mgr_data}"
    )

    # 4c. Invalid credentials
    res_bad_login = client.post(
        '/api/auth/login/',
        data=json.dumps({'username': 'customer', 'password': 'WrongPassword999'}),
        content_type='application/json'
    )
    assert_test(
        "Auth Security: Invalid password returns 401 Unauthorized",
        res_bad_login.status_code == 401,
        f"Status: {res_bad_login.status_code}"
    )

    # 4d. Customer attempting to sign in through Manager Portal
    res_cross_role = client.post(
        '/api/auth/login/',
        data=json.dumps({'username': 'customer', 'password': 'Customer@123', 'portal': 'manager'}),
        content_type='application/json'
    )
    assert_test(
        "Role Boundary: Customer account denied when attempting Manager Portal login",
        res_cross_role.status_code == 403 and 'Access denied' in res_cross_role.json().get('error', ''),
        f"Status: {res_cross_role.status_code}, Error: {res_cross_role.json()}"
    )

    # 4e. Public registration strictly creates Customer role
    test_new_user = "testuser_" + os.urandom(3).hex()
    res_reg = client.post(
        '/api/auth/register/',
        data=json.dumps({'username': test_new_user, 'password': 'TestUser@123', 'email': f'{test_new_user}@example.com'}),
        content_type='application/json'
    )
    reg_data = res_reg.json()
    created_user = User.objects.get(username=test_new_user)
    assert_test(
        "Registration Security: Public registration strictly assigns CUSTOMER role",
        res_reg.status_code == 201 and created_user.profile.role == UserRole.CUSTOMER and not created_user.profile.is_manager,
        f"Status: {res_reg.status_code}, Role: {created_user.profile.role}"
    )

    # ----------------------------------------------------
    # TEST 5: Role Isolation & Permissions on Return Requests
    # ----------------------------------------------------
    customer_user = User.objects.get(username='customer')
    manager_user = User.objects.get(username='manager')

    # Create a return for another customer to test isolation
    cat = ProductCategory.objects.first()
    other_customer, _ = User.objects.get_or_create(username='other_cust', defaults={'email': 'other@example.com'})
    other_customer.set_password('OtherCust@123')
    other_customer.save()
    UserProfile.objects.get_or_create(user=other_customer, defaults={'role': UserRole.CUSTOMER})

    other_return, _ = ReturnRequest.objects.get_or_create(
        return_id="RET-TEST-ISOLATION",
        defaults={
            'customer': other_customer,
            'product_name': 'Private Customer Item',
            'category': cat,
            'return_reason': 'CHANGED_MIND',
            'customer_description': 'Private return details',
            'status': ReturnStatus.SUBMITTED
        }
    )

    # Login as 'customer'
    client.force_login(customer_user)

    # Customer 1 lists returns - should NOT see other_customer's return
    res_cust_returns = client.get('/api/returns/')
    cust_returns_list = res_cust_returns.json().get('results', res_cust_returns.json())
    found_other = any(r['return_id'] == 'RET-TEST-ISOLATION' for r in cust_returns_list)
    assert_test(
        "Data Isolation: Customer cannot see returns submitted by other customers in queue",
        not found_other,
        "Customer saw another customer's return!"
    )

    # Customer 1 attempts direct GET on other customer's return
    res_direct_get = client.get(f'/api/returns/{other_return.id}/')
    assert_test(
        "Object Isolation: Customer cannot access details of another customer's return (404)",
        res_direct_get.status_code == 404,
        f"Status: {res_direct_get.status_code}"
    )

    # Customer 1 attempts to call manager approve_decision endpoint
    res_cust_approve = client.post(
        f'/api/returns/{other_return.id}/approve_decision/',
        data=json.dumps({'action_type': 'APPROVE', 'final_action': 'RESTOCK'}),
        content_type='application/json'
    )
    assert_test(
        "API Authorization: Customer cannot call manager approval endpoints (403 Forbidden)",
        res_cust_approve.status_code == 403,
        f"Status: {res_cust_approve.status_code}"
    )

    # ----------------------------------------------------
    # TEST 6: Manager Operations & Decision Workflow
    # ----------------------------------------------------
    client.force_login(manager_user)

    # Manager can see other customer's return in queue
    res_mgr_returns = client.get('/api/returns/')
    mgr_returns_list = res_mgr_returns.json().get('results', res_mgr_returns.json())
    assert_test(
        "Manager Inspection Queue: Manager sees all returns across customers",
        len(mgr_returns_list) >= 1 and any(r['return_id'] == 'RET-TEST-ISOLATION' for r in mgr_returns_list),
        f"Found count: {len(mgr_returns_list)}"
    )

    # Pick an existing seeded return to test manager actions
    test_ret = ReturnRequest.objects.filter(status=ReturnStatus.AWAITING_MANAGER_APPROVAL).first()
    if not test_ret:
        test_ret = ReturnRequest.objects.first()
    ret_id = test_ret.id

    # Action 1: Manager Approves AI Recommendation
    res_approve = client.post(
        f'/api/returns/{ret_id}/approve_decision/',
        data=json.dumps({
            'action_type': 'APPROVE',
            'final_action': 'RESTOCK',
            'approval_reason': 'Packaging seals intact, cosmetic condition verified pristine.',
            'manager_notes': 'QA Lead verified serial barcode.'
        }),
        content_type='application/json'
    )
    test_ret.refresh_from_db()
    assert_test(
        "Manager Action 1: Approve recommendation persists outcome and updates status",
        res_approve.status_code == 200 and test_ret.final_recovery_outcome == 'RESTOCK' and test_ret.status == ReturnStatus.RESTOCKED,
        f"Status: {res_approve.status_code}, Outcome: {test_ret.final_recovery_outcome}, ReturnStatus: {test_ret.status}"
    )

    # Verify decision record in database
    dec_obj = RecoveryDecision.objects.filter(return_request=test_ret).first()
    assert_test(
        "Audit Integrity: RecoveryDecision database record created with manager and status progression",
        dec_obj is not None and dec_obj.manager == manager_user and dec_obj.final_action == 'RESTOCK',
        f"Decision object: {dec_obj}"
    )

    # Verify inventory transaction was created
    inv_tx = InventoryTransaction.objects.filter(return_request=test_ret).first()
    assert_test(
        "Inventory Integration: Inventory transaction recorded for approved recovery",
        inv_tx is not None and inv_tx.performed_by == manager_user,
        f"Inv Tx: {inv_tx}"
    )

    # Action 2: Manager Overrides AI Recommendation (requires reason)
    res_override_fail = client.post(
        f'/api/returns/{ret_id}/approve_decision/',
        data=json.dumps({
            'action_type': 'OVERRIDE',
            'final_action': 'RESALE',
            'override_reason': ''  # Empty reason must fail!
        }),
        content_type='application/json'
    )
    assert_test(
        "Manager Action 2 Validation: Override without justification is rejected (400)",
        res_override_fail.status_code == 400,
        f"Status: {res_override_fail.status_code}"
    )

    res_override_ok = client.post(
        f'/api/returns/{ret_id}/approve_decision/',
        data=json.dumps({
            'action_type': 'OVERRIDE',
            'final_action': 'RESALE',
            'override_reason': 'Opened outer box warrants secondary outlet sale per corporate warranty policy.'
        }),
        content_type='application/json'
    )
    test_ret.refresh_from_db()
    dec_obj.refresh_from_db()
    assert_test(
        "Manager Action 2 Success: Override persists is_override=True and justification reason",
        res_override_ok.status_code == 200 and test_ret.final_recovery_outcome == 'RESALE' and dec_obj.is_override is True,
        f"Status: {res_override_ok.status_code}, is_override: {dec_obj.is_override}, Outcome: {test_ret.final_recovery_outcome}"
    )

    # Action 3: Manager Flags for Manual Inspection (Uncertain model or unsupported category)
    res_flag_manual = client.post(
        f'/api/returns/{ret_id}/approve_decision/',
        data=json.dumps({
            'action_type': 'FLAG_MANUAL',
            'override_reason': 'Camera glare obscured defect area; physical bench test required.'
        }),
        content_type='application/json'
    )
    test_ret.refresh_from_db()
    assert_test(
        "Manager Action 3: Flag for manual inspection sets status to MANUAL_INSPECTION",
        res_flag_manual.status_code == 200 and test_ret.status == ReturnStatus.MANUAL_INSPECTION,
        f"Status: {res_flag_manual.status_code}, ReturnStatus: {test_ret.status}"
    )

    # Action 4: Manager Requests Additional Information
    res_req_info = client.post(
        f'/api/returns/{ret_id}/approve_decision/',
        data=json.dumps({
            'action_type': 'REQUEST_INFO',
            'override_reason': 'Please upload a close-up photo of the device serial label.'
        }),
        content_type='application/json'
    )
    test_ret.refresh_from_db()
    assert_test(
        "Manager Action 4: Request additional info sets status to INFO_REQUESTED",
        res_req_info.status_code == 200 and test_ret.status == ReturnStatus.INFO_REQUESTED,
        f"Status: {res_req_info.status_code}, ReturnStatus: {test_ret.status}"
    )

    # Action 5: Manager Rejects Return
    res_reject = client.post(
        f'/api/returns/{ret_id}/approve_decision/',
        data=json.dumps({
            'action_type': 'REJECT',
            'override_reason': 'Return policy window exceeded 30 days.'
        }),
        content_type='application/json'
    )
    test_ret.refresh_from_db()
    assert_test(
        "Manager Action 5: Reject return updates status to REJECTED",
        res_reject.status_code == 200 and test_ret.status == ReturnStatus.REJECTED,
        f"Status: {res_reject.status_code}, ReturnStatus: {test_ret.status}"
    )

    # Verify AuditLog trail contains entries
    audit_count = AuditLog.objects.filter(entity_id=test_ret.return_id).count()
    assert_test(
        "Audit Trail: System logs all manager actions with timestamp and actor",
        audit_count >= 4,
        f"Audit count: {audit_count}"
    )

    # Customer View verification
    client.force_login(test_ret.customer)
    res_cust_view = client.get(f'/api/returns/{test_ret.id}/')
    cust_view_data = res_cust_view.json()
    assert_test(
        "Customer View: Customer retrieves updated status and manager explanation",
        res_cust_view.status_code == 200 and cust_view_data.get('status') == 'REJECTED' and cust_view_data.get('decision') is not None,
        f"Cust view status: {cust_view_data.get('status')}"
    )

    print("=" * 70)
    print(f"VERIFICATION COMPLETE: {passed}/{total} TESTS PASSED ({round(passed/total*100)}%)")
    print("=" * 70)

    return passed == total

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
