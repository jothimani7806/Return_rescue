import requests
import io
import json
from PIL import Image

BASE = 'http://127.0.0.1:8000/api'

def run_tests():
    customer_sess = requests.Session()
    login_res = customer_sess.post(f'{BASE}/auth/login/', json={'username': 'customer', 'password': 'customer123'})
    print('1. Customer Login HTTP Status:', login_res.status_code)

    # Create in-memory test image
    buf = io.BytesIO()
    img = Image.new('RGB', (200, 200), color=(120, 80, 200))
    img.save(buf, format='JPEG')
    buf.seek(0)

    # Submit Return Request with detailed entered data
    entered_answers = {'screen_flickering': True, 'casing_scuffed': True}
    data = {
        'product_name': 'Apple MacBook Pro 16 M3',
        'category_slug': 'computers-laptops-and-peripherals',
        'sku': 'COMP-MBP16-001',
        'return_reason': 'DEFECTIVE_OR_DAMAGED',
        'customer_description': 'Screen exhibits sporadic flicker after 15 minutes of usage.',
        'condition_answers': json.dumps(entered_answers),
        'is_functional': 'true',
        'packaging_condition': 'ORIGINAL_OPENED',
        'missing_accessories': json.dumps(['Original USB-C Magsafe Cable'])
    }
    files = [('images', ('macbook_top.jpg', buf, 'image/jpeg'))]

    submit_res = customer_sess.post(f'{BASE}/returns/', data=data, files=files)
    print('2. Submit Return HTTP Status:', submit_res.status_code)
    if submit_res.status_code != 201:
        print('Error:', submit_res.text)
        return
    ret = submit_res.json()
    return_id = ret['return_id']
    db_pk = ret['id']
    print('   -> Return ID Generated:', return_id, f'(PK: {db_pk})')
    print('   -> Stored Product Name:', ret['product_name'])
    print('   -> AI Overall Condition:', ret['ai_inspection']['overall_condition'])
    print('   -> Stored Condition Answers:', ret['condition_answers'])

    # Manager Login and Store Decision
    mgr_sess = requests.Session()
    mgr_login = mgr_sess.post(f'{BASE}/auth/login/', json={'username': 'manager', 'password': 'manager123'})
    print('3. Manager Login HTTP Status:', mgr_login.status_code)

    decision_payload = {
        'final_action': 'REPAIR',
        'is_override': True,
        'override_reason': 'Display panel cable loose; repair cost is under 20% of retail value.',
        'manager_notes': 'Sent to Technical Refurbishment Center Bay 4.',
        'checklist_verification': {'hardware_safety': True, 'power_tested': True}
    }
    decide_res = mgr_sess.post(f'{BASE}/returns/{db_pk}/approve_decision/', json=decision_payload)
    print('4. Manager Decision HTTP Status:', decide_res.status_code)
    if decide_res.status_code != 200:
        print('Error:', decide_res.text)
        return
    updated_ret = decide_res.json()
    print('   -> Updated Status:', updated_ret['status'])
    print('   -> Final Outcome:', updated_ret['final_recovery_outcome'])
    print('   -> Decision Stored in DB:', updated_ret['decision']['final_action'])
    print('   -> Override Reason Stored in DB:', updated_ret['decision']['override_reason'])

    # Manager Creates New Category
    import time
    ts = int(time.time())
    cat_payload = {
        'name': f'Musical Instruments {ts}',
        'slug': f'musical-instruments-{ts}',
        'description': 'Guitars, synthesizers, studio audio monitors, and microphones.',
        'is_active': True,
        'is_ai_supported': False,
        'ai_support_notes': 'Requires human acoustic and physical inspection.'
    }
    cat_res = mgr_sess.post(f'{BASE}/categories/', json=cat_payload)
    print('5. Category Creation HTTP Status:', cat_res.status_code)
    if cat_res.status_code == 201:
        print('   -> Created Category Name:', cat_res.json().get('name'), 'Slug:', cat_res.json().get('slug'))
    else:
        print('   -> Category Error:', cat_res.text[:200])

if __name__ == '__main__':
    run_tests()
