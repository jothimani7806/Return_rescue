"""
Verify that Customer and Manager maintain independent, non-overlapping sessions
across concurrent tabs without any session leakage.
"""
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_multitab_session_isolation():
    print("[*] Testing Concurrent Tab 1 (Customer) and Tab 2 (Manager) Isolation...")

    # Tab 1: Customer Login
    s1 = requests.Session()
    r1 = s1.post(f"{BASE_URL}/api/auth/login/", json={
        "username": "customer",
        "password": "Customer@123",
        "portal": "customer"
    })
    assert r1.status_code == 200, f"Customer login failed: {r1.text}"
    token_cust = r1.json()['token']
    user_cust = r1.json()['user']
    print(f"[+] Tab 1 logged in as: {user_cust['username']} (Role: {user_cust['profile']['role']})")

    # Tab 2: Manager Login
    s2 = requests.Session()
    r2 = s2.post(f"{BASE_URL}/api/auth/login/", json={
        "username": "manager",
        "password": "Manager@123",
        "portal": "manager"
    })
    assert r2.status_code == 200, f"Manager login failed: {r2.text}"
    token_mgr = r2.json()['token']
    user_mgr = r2.json()['user']
    print(f"[+] Tab 2 logged in as: {user_mgr['username']} (Role: {user_mgr['profile']['role']})")

    # Verify Tab 1 requests identity using Tab 1 token
    t1_me = requests.get(f"{BASE_URL}/api/auth/me/", headers={"Authorization": f"Token {token_cust}"})
    assert t1_me.status_code == 200
    assert t1_me.json()['username'] == 'customer', "Tab 1 identity changed!"
    assert t1_me.json()['profile']['role'] == 'CUSTOMER'
    print("[+] Tab 1 remains Customer: PASSED")

    # Verify Tab 2 requests identity using Tab 2 token
    t2_me = requests.get(f"{BASE_URL}/api/auth/me/", headers={"Authorization": f"Token {token_mgr}"})
    assert t2_me.status_code == 200
    assert t2_me.json()['username'] == 'manager', "Tab 2 identity changed!"
    assert t2_me.json()['profile']['role'] == 'MANAGER'
    print("[+] Tab 2 remains Manager: PASSED")

    # Verify Tab 1 cannot access manager endpoints
    t1_mgr_action = requests.get(f"{BASE_URL}/api/inventory/", headers={"Authorization": f"Token {token_cust}"})
    assert t1_mgr_action.status_code in [403, 401], f"Tab 1 bypassed manager check: {t1_mgr_action.status_code}"
    print("[+] Tab 1 forbidden from Manager endpoints: PASSED")

    # Verify Tab 2 can access manager endpoints
    t2_mgr_action = requests.get(f"{BASE_URL}/api/inventory/", headers={"Authorization": f"Token {token_mgr}"})
    assert t2_mgr_action.status_code == 200, f"Tab 2 failed manager inventory: {t2_mgr_action.status_code}"
    print("[+] Tab 2 can access Manager endpoints: PASSED")

    print("[SUCCESS] Both tabs operate completely independently with zero session overlap!")

if __name__ == '__main__':
    test_multitab_session_isolation()
