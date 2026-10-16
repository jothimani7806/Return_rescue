"""
Test:
1. Verify default manager name is 'Jothimani'.
2. Verify customer and manager can manually change their display name via settings.
3. Verify manager can delete records from the return queue.
"""
import requests

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("[*] 1. Testing Default Manager Name...")
    # Manager login
    res_mgr_login = requests.post(f"{BASE_URL}/api/auth/login/", json={
        "username": "manager",
        "password": "Manager@123",
        "portal": "manager"
    })
    assert res_mgr_login.status_code == 200
    mgr_data = res_mgr_login.json()
    mgr_token = mgr_data['token']
    mgr_user = mgr_data['user']
    print(f"[+] Manager first_name: {mgr_user.get('first_name')} (expected 'Jothimani')")
    assert mgr_user.get('first_name') == 'Jothimani', f"Expected 'Jothimani', got {mgr_user.get('first_name')}"
    print("[PASS] Default manager name is 'Jothimani'.")

    print("\n[*] 2. Testing Manual Name Change via Settings Endpoint...")
    # Update manager name via PATCH /api/auth/profile/
    res_update_mgr = requests.patch(
        f"{BASE_URL}/api/auth/profile/",
        headers={"Authorization": f"Token {mgr_token}"},
        json={"first_name": "Jothimani", "last_name": "Operations Head", "department": "AI Quality Control"}
    )
    assert res_update_mgr.status_code == 200
    updated_mgr = res_update_mgr.json()
    assert updated_mgr['first_name'] == 'Jothimani'
    assert updated_mgr['last_name'] == 'Operations Head'
    print(f"[PASS] Manager name updated via Settings: {updated_mgr['first_name']} {updated_mgr['last_name']}")

    # Customer login & name update
    res_cust_login = requests.post(f"{BASE_URL}/api/auth/login/", json={
        "username": "customer",
        "password": "Customer@123",
        "portal": "customer"
    })
    assert res_cust_login.status_code == 200
    cust_token = res_cust_login.json()['token']

    res_update_cust = requests.patch(
        f"{BASE_URL}/api/auth/profile/",
        headers={"Authorization": f"Token {cust_token}"},
        json={"first_name": "Arun", "last_name": "Kumar"}
    )
    assert res_update_cust.status_code == 200
    updated_cust = res_update_cust.json()
    assert updated_cust['first_name'] == 'Arun'
    print(f"[PASS] Customer name updated via Settings: {updated_cust['first_name']} {updated_cust['last_name']}")

    print("\n[*] 3. Testing Deleting Record from Return Queue...")
    # Fetch returns as manager
    res_returns = requests.get(
        f"{BASE_URL}/api/returns/",
        headers={"Authorization": f"Token {mgr_token}"}
    )
    assert res_returns.status_code == 200
    returns_list = res_returns.json().get('results', res_returns.json())
    assert len(returns_list) > 0, "No returns found to test delete!"

    target_return = returns_list[0]
    target_id = target_return['id']
    target_return_id = target_return['return_id']
    print(f"[*] Deleting return #{target_id} ({target_return_id})...")

    # Delete return request as manager
    res_delete = requests.delete(
        f"{BASE_URL}/api/returns/{target_id}/",
        headers={"Authorization": f"Token {mgr_token}"}
    )
    assert res_delete.status_code in [204, 200], f"Delete failed: {res_delete.status_code} {res_delete.text}"
    print(f"[PASS] Return #{target_id} deleted successfully.")

    # Verify return no longer exists in queue
    res_get_deleted = requests.get(
        f"{BASE_URL}/api/returns/{target_id}/",
        headers={"Authorization": f"Token {mgr_token}"}
    )
    assert res_get_deleted.status_code == 404, f"Expected 404, got {res_get_deleted.status_code}"
    print("[PASS] Deleted return successfully purged from Return Queue (404 verified).")

    print("\n=======================================================")
    print("ALL TESTS PASSED: NAME SETTINGS & RECORD DELETION VERIFIED")
    print("=======================================================")

if __name__ == '__main__':
    run_tests()
