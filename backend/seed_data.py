import os
import sys
import django
from decimal import Decimal
from PIL import Image, ImageDraw

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'return_rescue.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from django.conf import settings
from core.models import (
    UserProfile, UserRole,
    ProductCategory, ProductSubcategory, Product,
    ProductInspectionRule, ReturnRequest, ReturnImage,
    AIInspection, RecoveryRecommendation, RecoveryDecision,
    InventoryTransaction, InventoryTransactionType,
    Notification, AuditLog,
    ReturnStatus, RecoveryOutcome, ReturnReason,
    PackagingCondition, ImageViewLabel, VisualConditionChoice
)
from core.dataset_service import DatasetAcquisitionService

def create_sample_image(filename, text, bg_color=(40, 50, 70), text_color=(240, 240, 250)):
    out_dir = settings.MEDIA_ROOT / 'returns' / 'sample'
    out_dir.mkdir(parents=True, exist_ok=True)
    filepath = out_dir / filename
    if not filepath.exists():
        img = Image.new('RGB', (600, 600), color=bg_color)
        draw = ImageDraw.Draw(img)
        # Draw border
        draw.rectangle([10, 10, 590, 590], outline=(100, 120, 160), width=4)
        # Draw labels
        draw.text((30, 40), "RETURN RESCUE - INSPECTION CAPTURE", fill=(140, 180, 255))
        draw.text((30, 80), f"Item: {text}", fill=text_color)
        draw.text((30, 120), f"Timestamp: {timezone.now().strftime('%Y-%m-%d %H:%M')}", fill=(180, 190, 200))
        # Draw visual mockup shape
        draw.rectangle([150, 200, 450, 480], outline=(160, 180, 220), fill=(bg_color[0]+20, bg_color[1]+20, bg_color[2]+20), width=3)
        draw.text((180, 320), text[:24], fill=(255, 255, 255))
        img.save(filepath, format='JPEG', quality=90)
    return str(filepath.relative_to(settings.MEDIA_ROOT)).replace('\\', '/')

def run_seed():
    print("========================================")
    print("SEEDING UNIVERSAL RETURN RESCUE DATABASE")
    print("========================================")

    # 1. USERS
    admin_user, _ = User.objects.get_or_create(
        username='admin',
        defaults={'email': 'admin@returnrescue.io', 'is_staff': True, 'is_superuser': True}
    )
    admin_user.set_password('Admin@123')
    admin_user.save()
    UserProfile.objects.update_or_create(user=admin_user, defaults={'role': UserRole.ADMIN})

    manager_user, _ = User.objects.get_or_create(
        username='manager',
        defaults={'email': 'manager@returnrescue.io', 'first_name': 'Jothimani', 'last_name': '', 'is_staff': True}
    )
    manager_user.set_password('Manager@123')
    manager_user.save()
    UserProfile.objects.update_or_create(user=manager_user, defaults={'role': UserRole.MANAGER, 'department': 'Returns Operations'})

    customer_user, _ = User.objects.get_or_create(
        username='customer',
        defaults={'email': 'alex.morgan@example.com', 'first_name': 'Alex', 'last_name': 'Morgan'}
    )
    customer_user.set_password('Customer@123')
    customer_user.save()
    UserProfile.objects.update_or_create(user=customer_user, defaults={'role': UserRole.CUSTOMER, 'phone_number': '+1-555-0199'})

    print("[+] Users created: admin / manager / customer (passwords: Admin@123, Manager@123, Customer@123)")

    # 2. PRODUCT CATEGORIES (Comprehensive Catalog)
    catalog_spec = [
        {
            'name': 'Clothing and apparel',
            'slug': 'clothing-and-apparel',
            'icon': 'Shirt',
            'desc': 'Garments, tops, pants, dresses, outerwear, and textile fashion items.',
            'is_ai_supported': True,
            'notes': 'Trained on Garment Defect benchmark. Detects fabric tears, holes, stains, and missing fasteners.',
            'subcategories': ['Shirts & Tops', 'Pants & Jeans', 'Jackets & Outerwear', 'Dresses & Skirts', 'Activewear'],
            'defects': ['Fabric tear / hole', 'Seam unraveling', 'Surface stain / discoloration', 'Missing button / zipper fault'],
            'questions': ['Are fabric tags and care labels intact?', 'Has the garment been laundered or worn?'],
            'safety': ['Pins or broken needles left in garment', 'Biohazard / hazardous fluid stain'],
            'repair_ratio': 0.40,
        },
        {
            'name': 'Footwear',
            'slug': 'footwear',
            'icon': 'Footprints',
            'desc': 'Athletic shoes, formal shoes, boots, sneakers, sandals, and work boots.',
            'is_ai_supported': True,
            'notes': 'Trained on Footwear Damage dataset. Detects sole separation, upper mesh tears, and scuffs.',
            'subcategories': ['Sneakers & Athletic', 'Boots', 'Dress Shoes', 'Sandals & Slides'],
            'defects': ['Sole separation', 'Upper leather scuff', 'Torn mesh / stitching', 'Worn out tread'],
            'questions': ['Are insoles and original laces present?', 'Is the sole structurally intact?'],
            'safety': ['Exposed nail or structural shank puncture'],
            'repair_ratio': 0.35,
        },
        {
            'name': 'Bags and accessories',
            'slug': 'bags-and-accessories',
            'icon': 'Briefcase',
            'desc': 'Backpacks, handbags, luggage, wallets, belts, and leather accessories.',
            'is_ai_supported': True,
            'notes': 'Detects zipper failure, handle detachment, leather tears, and stains.',
            'subcategories': ['Backpacks', 'Handbags & Purses', 'Travel Luggage', 'Wallets & Belts'],
            'defects': ['Broken zipper', 'Detached strap / handle', 'Fabric puncture', 'Surface scratch'],
            'questions': ['Are all straps, locks, and dust bags included?'],
            'safety': ['Broken sharp metal buckles'],
            'repair_ratio': 0.40,
        },
        {
            'name': 'Smartphones and electronics',
            'slug': 'smartphones-and-electronics',
            'icon': 'Smartphone',
            'desc': 'Mobile phones, tablets, smartwatches, power banks, and portable gadgets.',
            'is_ai_supported': True,
            'notes': 'Trained on MVTec & Electronics Defect set. Detects screen cracks, casing dents, and port corrosion.',
            'subcategories': ['Smartphones', 'Tablets', 'Smartwatches', 'Power Banks & Chargers'],
            'defects': ['Screen glass crack', 'OLED bleed / lines', 'Chassis dent / scuff', 'USB port damage', 'Water indicator triggered'],
            'questions': ['Does device power on and boot to OS?', 'Has iCloud / Google account lock been removed?', 'Is charging functional?'],
            'safety': ['Lithium battery swelling / heat', 'Smoking or burning odor', 'Exposed bare wires'],
            'repair_ratio': 0.50,
        },
        {
            'name': 'Computers, laptops, and peripherals',
            'slug': 'computers-laptops-and-peripherals',
            'icon': 'Laptop',
            'desc': 'Laptops, desktop PCs, monitors, keyboards, mice, and storage devices.',
            'is_ai_supported': True,
            'notes': 'Trained on VisA and PCB inspection sets. Detects broken hinges, cracked displays, keycap defects.',
            'subcategories': ['Laptops', 'Monitors & Displays', 'Keyboards & Mice', 'External Storage', 'Cables & Hubs'],
            'defects': ['Cracked LCD panel', 'Broken hinge', 'Missing keyboard keys', 'Damaged power cord'],
            'questions': ['Does the machine POST and boot properly?', 'Is the BIOS/firmware unlocked?'],
            'safety': ['Sparking or frayed AC power adapter', 'Swollen laptop battery'],
            'repair_ratio': 0.45,
        },
        {
            'name': 'Headphones and audio equipment',
            'slug': 'headphones-and-audio-equipment',
            'icon': 'Headphones',
            'desc': 'Over-ear headphones, earbuds, Bluetooth speakers, microphones, and soundbars.',
            'is_ai_supported': True,
            'notes': 'Detects ear cushion tears, headband fractures, driver distortion.',
            'subcategories': ['Over-Ear Headphones', 'True Wireless Earbuds', 'Bluetooth Speakers', 'Microphones'],
            'defects': ['Cracked headband', 'Torn ear cushion', 'Driver rattle', 'Charging case failure'],
            'questions': ['Do both left and right audio channels produce clean sound?', 'Does Bluetooth pairing succeed?'],
            'safety': ['Overheating earbud batteries during charge'],
            'repair_ratio': 0.35,
        },
        {
            'name': 'Home appliances',
            'slug': 'home-appliances',
            'icon': 'Tv',
            'desc': 'Vacuums, air purifiers, heaters, humidifiers, and small household machines.',
            'is_ai_supported': True,
            'notes': 'Detects motor casing cracks, broken latches, electrical faults.',
            'subcategories': ['Robot Vacuums', 'Air Purifiers', 'Heaters & Fans', 'Steam Irons'],
            'defects': ['Housing crack', 'Motor humming / seized', 'Broken water tank latch', 'Missing filter'],
            'questions': ['Does unit complete a full operational cycle?', 'Are electrical cables intact?'],
            'safety': ['Exposed electrical conductors', 'Thermal fuse tripping / burning smell'],
            'repair_ratio': 0.40,
        },
        {
            'name': 'Kitchenware and cookware',
            'slug': 'kitchenware-and-cookware',
            'icon': 'Utensils',
            'desc': 'Pots, pans, blenders, coffee makers, knives, and food prep appliances.',
            'is_ai_supported': True,
            'notes': 'Detects non-stick coating scratches, chipped ceramics, bent handles.',
            'subcategories': ['Cookware & Pans', 'Blenders & Food Processors', 'Coffee & Espresso', 'Cutlery'],
            'defects': ['Coating peel / deep gouge', 'Chipped glass or ceramic', 'Loose / broken handle', 'Motor burnout'],
            'questions': ['Are food-contact surfaces clean and non-toxic?', 'Does blade assembly spin freely?'],
            'safety': ['Chipped glass in food jar', 'Sharp jagged metal fractures'],
            'repair_ratio': 0.30,
        },
        {
            'name': 'Furniture and home decor',
            'slug': 'furniture-and-home-decor',
            'icon': 'Armchair',
            'desc': 'Desks, office chairs, shelves, lamps, mirrors, and home accent furnishings.',
            'is_ai_supported': True,
            'notes': 'Detects structural joint wobbles, veneer cracks, broken glass panels.',
            'subcategories': ['Office Chairs', 'Desks & Tables', 'Shelving & Bookcases', 'Lamps & Lighting'],
            'defects': ['Fractured wooden frame', 'Stripped screw thread', 'Torn upholstery', 'Cracked glass mirror'],
            'questions': ['Are all assembly bolts and hardware included?', 'Does gas cylinder lift smoothly?'],
            'safety': ['Unstable collapsing chair mechanism', 'Shattered glass hazard'],
            'repair_ratio': 0.35,
        },
        {
            'name': 'Beauty and personal-care products',
            'slug': 'beauty-and-personal-care-products',
            'icon': 'Sparkles',
            'desc': 'Cosmetics, skincare serums, perfumes, hair styling tools, and electric shavers.',
            'is_ai_supported': True,
            'notes': 'Inspects hygiene tamper seals, liquid leakage, dispenser cracks.',
            'subcategories': ['Skincare & Serums', 'Hair Styling Tools', 'Electric Shavers', 'Fragrances'],
            'defects': ['Broken tamper seal', 'Product leakage', 'Cracked pump nozzle', 'Heating plate scratch'],
            'questions': ['Is the sanitary foil seal completely untouched?', 'Has expiry date passed?'],
            'safety': ['Chemical contamination or unsealed hygiene item'],
            'repair_ratio': 0.20,
        },
        {
            'name': 'Toys and games',
            'slug': 'toys-and-games',
            'icon': 'Gamepad2',
            'desc': 'Action figures, board games, remote-control models, LEGO, and educational kits.',
            'is_ai_supported': True,
            'notes': 'Detects missing small parts, sharp plastic breaks, battery corrosion.',
            'subcategories': ['Building Sets & Blocks', 'Board Games & Puzzles', 'RC Vehicles', 'Action Figures'],
            'defects': ['Missing game pieces', 'Cracked plastic with sharp corner', 'Battery terminal corrosion'],
            'questions': ['Are all choke-hazard warnings and parts complete?'],
            'safety': ['Sharp broken plastic edges on children toy', 'Loose button cell battery'],
            'repair_ratio': 0.30,
        },
        {
            'name': 'Books and stationery',
            'slug': 'books-and-stationery',
            'icon': 'BookOpen',
            'desc': 'Hardcovers, paperbacks, textbooks, art notebooks, and premium writing pens.',
            'is_ai_supported': True,
            'notes': 'Detects torn pages, spine breakage, water stains, highlighting.',
            'subcategories': ['Textbooks', 'Fiction & Literature', 'Art Notebooks', 'Fountain Pens'],
            'defects': ['Torn or missing pages', 'Broken spine binding', 'Liquid / water wave stain', 'Heavy ink markings'],
            'questions': ['Are all pages legible and bound?'],
            'safety': ['None'],
            'repair_ratio': 0.25,
        },
        {
            'name': 'Sports and fitness equipment',
            'slug': 'sports-and-fitness-equipment',
            'icon': 'Dumbbell',
            'desc': 'Dumbbells, resistance bands, yoga mats, cycling gear, and sports balls.',
            'is_ai_supported': True,
            'notes': 'Detects fraying cables, cracked weight collars, split seams.',
            'subcategories': ['Weights & Dumbbells', 'Yoga & Pilates', 'Cycling Accessories', 'Team Sports'],
            'defects': ['Frayed resistance cable', 'Cracked plastic casing', 'Deflated bladder', 'Torn grip'],
            'questions': ['Can equipment safely hold rated weight load?'],
            'safety': ['Frayed tension cable liable to snap under tension'],
            'repair_ratio': 0.30,
        },
        {
            'name': 'Tools and hardware',
            'slug': 'tools-and-hardware',
            'icon': 'Wrench',
            'desc': 'Power drills, hand tool sets, measuring devices, and fastening kits.',
            'is_ai_supported': True,
            'notes': 'Detects chuck wobble, motor brushes sparking, cracked plastic handles.',
            'subcategories': ['Power Drills & Drivers', 'Hand Tool Sets', 'Measuring & Levels', 'Tool Storage'],
            'defects': ['Motor sparking / brush wear', 'Bent drive shaft', 'Cracked battery casing', 'Missing drill bits'],
            'questions': ['Does safety brake and clutch engage properly?'],
            'safety': ['Damaged insulation on 120V cord', 'Unstable battery latch'],
            'repair_ratio': 0.40,
        },
        {
            'name': 'Baby products',
            'slug': 'baby-products',
            'icon': 'Baby',
            'desc': 'Strollers, baby monitors, feeding bottles, carriers, and nursery safety items.',
            'is_ai_supported': True,
            'notes': 'Strict safety checks: latch integrity, hygiene seals, harness testing.',
            'subcategories': ['Strollers & Carriers', 'Baby Monitors', 'Feeding & Bottles', 'Nursery Safety'],
            'defects': ['Broken safety latch', 'Missing 5-point harness buckle', 'Torn fabric mesh', 'Opened bottle seal'],
            'questions': ['Are all safety harness straps, buckles, and brakes 100% operational?'],
            'safety': ['Compromised safety harness on stroller or car seat (Mandatory Recycle)'],
            'repair_ratio': 0.20,
        },
        {
            'name': 'Automotive accessories',
            'slug': 'automotive-accessories',
            'icon': 'Car',
            'desc': 'Dashcams, OBD scanners, tire inflators, jump starters, and phone mounts.',
            'is_ai_supported': True,
            'notes': 'Inspects 12V plugs, suction mounts, high-capacity jump starter cells.',
            'subcategories': ['Dashcams', 'Jump Starters & Inflators', 'Phone Mounts', 'Diagnostic Scanners'],
            'defects': ['Cracked lens', 'Swollen jump starter battery', 'Broken suction clamp', 'Corroded clamp cables'],
            'questions': ['Does 12V plug seat firmly without overheating?'],
            'safety': ['Swollen ultra-high-rate lithium jump pack'],
            'repair_ratio': 0.35,
        },
        {
            'name': 'Other and custom product categories',
            'slug': 'other-and-custom-product-categories',
            'icon': 'HelpCircle',
            'desc': 'Unclassified specialty products, custom merchandise, or novel return items.',
            'is_ai_supported': False,
            'notes': 'No verified model. Requires manual manager review and checklist evaluation.',
            'subcategories': ['General Merchandise', 'Custom Items'],
            'defects': ['Unspecified physical defect'],
            'questions': ['Describe product condition in detail.'],
            'safety': ['Check for unknown hazards'],
            'repair_ratio': 0.40,
        }
    ]

    for spec in catalog_spec:
        cat, _ = ProductCategory.objects.update_or_create(
            slug=spec['slug'],
            defaults={
                'name': spec['name'],
                'icon': spec['icon'],
                'description': spec['desc'],
                'is_active': True,
                'is_ai_supported': spec['is_ai_supported'],
                'ai_support_notes': spec['notes']
            }
        )
        for sub_name in spec['subcategories']:
            sub_slug = sub_name.lower().replace('&', 'and').replace(' ', '-').replace('/', '-')
            ProductSubcategory.objects.get_or_create(
                category=cat,
                slug=sub_slug,
                defaults={'name': sub_name, 'description': f"{sub_name} under {cat.name}"}
            )

        ProductInspectionRule.objects.update_or_create(
            category=cat,
            defaults={
                'defect_checklist': spec['defects'],
                'functionality_questions': spec['questions'],
                'safety_checklist': spec['safety'],
                'max_repair_cost_ratio': spec['repair_ratio'],
                'resale_min_condition_score': 0.65,
                'auto_recycle_if_unsafe': True,
                'rule_description': f"Dynamic inspection rules for {cat.name}"
            }
        )

    print(f"[+] Seeded {len(catalog_spec)} Categories with Subcategories & Inspection Rules.")

    # 3. SAMPLE PRODUCTS IN CATALOG
    products_spec = [
        ('ELC-IPHONE15-128', 'Apple iPhone 15 128GB Midnight', 'smartphones-and-electronics', 'Smartphones', 'Apple', 'A3090', 799.00, 250.00, True, False, True),
        ('ELC-GALAXY-S24', 'Samsung Galaxy S24 256GB Onyx', 'smartphones-and-electronics', 'Smartphones', 'Samsung', 'SM-S921U', 859.00, 260.00, True, False, True),
        ('CLO-LEVI-501', "Levi's 501 Original Fit Jeans - 32x32", 'clothing-and-apparel', 'Pants & Jeans', "Levi's", '501-0000', 89.50, 15.00, True, False, False),
        ('CLO-PATAG-FLEECE', 'Patagonia Classic Retro-X Fleece Jacket', 'clothing-and-apparel', 'Jackets & Outerwear', 'Patagonia', '23056', 229.00, 45.00, True, False, False),
        ('FTW-NIKE-AIRMAX', 'Nike Air Max 270 Black/Anthracite (Size 10.5)', 'footwear', 'Sneakers & Athletic', 'Nike', 'AH8050-002', 160.00, 30.00, True, False, False),
        ('CMP-MBP14-M3', 'Apple MacBook Pro 14" M3 Pro 512GB Space Gray', 'computers-laptops-and-peripherals', 'Laptops', 'Apple', 'MRX33LL/A', 1999.00, 700.00, True, False, True),
        ('AUD-SONY-WH1000', 'Sony WH-1000XM5 Wireless Noise Canceling Headphones', 'headphones-and-audio-equipment', 'Over-Ear Headphones', 'Sony', 'WH1000XM5/B', 399.99, 110.00, True, False, False),
        ('APP-DYSON-V12', 'Dyson V12 Detect Slim Cordless Vacuum', 'home-appliances', 'Robot Vacuums', 'Dyson', '368340-01', 649.99, 180.00, True, False, True),
        ('KIT-LECREU-DUTCH', 'Le Creuset Enameled Cast Iron Dutch Oven 5.5 Qt', 'kitchenware-and-cookware', 'Cookware & Pans', 'Le Creuset', 'LS2501-2667', 420.00, 95.00, True, False, False),
        ('BTY-LA-MER-CREAM', 'Crème de la Mer Moisturizing Cream 60ml', 'beauty-and-personal-care-products', 'Skincare & Serums', 'La Mer', 'LM-001', 380.00, 0.00, False, True, False),
        ('TOY-LEGO-FALCON', 'LEGO Star Wars Millennium Falcon 75192 Collector', 'toys-and-games', 'Building Sets & Blocks', 'LEGO', '75192', 849.99, 320.00, True, False, False),
    ]

    for sku, name, cat_slug, sub_name, brand, model_no, price, salvage, resale_ok, hygiene, safety in products_spec:
        cat = ProductCategory.objects.get(slug=cat_slug)
        sub = ProductSubcategory.objects.filter(category=cat, name=sub_name).first()
        Product.objects.update_or_create(
            sku=sku,
            defaults={
                'name': name,
                'category': cat,
                'subcategory': sub,
                'brand': brand,
                'model_number': model_no,
                'retail_price': Decimal(str(price)),
                'expected_salvage_value': Decimal(str(salvage)),
                'resale_eligible': resale_ok,
                'is_hygiene_sensitive': hygiene,
                'is_safety_critical': safety
            }
        )

    print(f"[+] Seeded {len(products_spec)} Catalog Products.")

    # 4. DATASET SOURCES SEEDING
    DatasetAcquisitionService.seed_registry()
    print("[+] Seeded Dataset Source Registry (MVTec AD, VisA, Kaggle, HuggingFace, Starter Pack).")

    # 5. SAMPLE RETURN REQUESTS (Covering RESTOCK, RESALE, REPAIR, RECYCLING)
    returns_seed_data = [
        # 1. RESTOCK Case: Sony Headphones - unopened box, changed mind
        {
            'sku': 'AUD-SONY-WH1000',
            'product_name': 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
            'category_slug': 'headphones-and-audio-equipment',
            'reason': ReturnReason.CHANGED_MIND,
            'desc': 'Item unopened. I received another pair as a gift so this is surplus.',
            'functional': True,
            'packaging': PackagingCondition.ORIGINAL_SEALED,
            'missing_acc': [],
            'visual_cond': VisualConditionChoice.GOOD_OR_NO_VISIBLE_DAMAGE,
            'confidence': 0.96,
            'defects': [],
            'rec_action': RecoveryOutcome.RESTOCK,
            'rec_rationale': 'Item is complete, safe, and fully functional with no visible cosmetic damage.\nOriginal factory seal intact. Qualifies for immediate restock into prime inventory.',
            'repair_cost': Decimal('0.00'),
            'resale_val': Decimal('380.00'),
            'status': ReturnStatus.RESTOCKED,
            'final_action': RecoveryOutcome.RESTOCK,
            'img_label': 'Sealed Sony Headphones Box',
        },
        # 2. RESALE Case: Apple iPhone 15 - minor scuff on corner, changed mind
        {
            'sku': 'ELC-IPHONE15-128',
            'product_name': 'Apple iPhone 15 128GB Midnight',
            'category_slug': 'smartphones-and-electronics',
            'reason': ReturnReason.NOT_AS_DESCRIBED,
            'desc': 'Opened and used for 3 days. Minor scratch on bezel, otherwise works perfectly.',
            'functional': True,
            'packaging': PackagingCondition.ORIGINAL_OPENED,
            'missing_acc': [],
            'visual_cond': VisualConditionChoice.SCRATCH_OR_SCUFF,
            'confidence': 0.89,
            'defects': [{'defect': 'Scratch or Surface Scuff', 'confidence': 0.89, 'view': 'SIDE', 'notes': 'Micro-abrasion on lower bezel'}],
            'rec_action': RecoveryOutcome.RESALE,
            'rec_rationale': 'Item is functional and safe to use.\nMinor cosmetic scuffs or scratches present, suitable for discounted secondary resale.',
            'repair_cost': Decimal('0.00'),
            'resale_val': Decimal('560.00'),
            'status': ReturnStatus.LISTED_FOR_RESALE,
            'final_action': RecoveryOutcome.RESALE,
            'img_label': 'iPhone 15 with Bezel Scuff',
        },
        # 3. REPAIR Case: Patagonia Fleece - torn seam along pocket
        {
            'sku': 'CLO-PATAG-FLEECE',
            'product_name': 'Patagonia Classic Retro-X Fleece Jacket',
            'category_slug': 'clothing-and-apparel',
            'reason': ReturnReason.DEFECTIVE_OR_DAMAGED,
            'desc': 'Seam arrived torn along the chest pocket zipper. Needs stitching repair.',
            'functional': True,
            'packaging': PackagingCondition.ORIGINAL_OPENED,
            'missing_acc': [],
            'visual_cond': VisualConditionChoice.TEAR_OR_RIP,
            'confidence': 0.92,
            'defects': [{'defect': 'Tear or Fabric Rip', 'confidence': 0.92, 'view': 'FRONT', 'notes': 'Seam separation at pocket'}],
            'rec_action': RecoveryOutcome.REPAIR,
            'rec_rationale': 'Item has repairable defect (Tear, Hole, or Fabric Rip).\nEstimated repair cost ($15.00) is 6.6% of retail price ($229.00), below max threshold of 40%.\nApproved for garment refurbishing center.',
            'repair_cost': Decimal('15.00'),
            'resale_val': Decimal('160.00'),
            'status': ReturnStatus.IN_REPAIR,
            'final_action': RecoveryOutcome.REPAIR,
            'img_label': 'Patagonia Fleece Pocket Tear',
        },
        # 4. RECYCLING Case: Dyson V12 - shattered motor casing & cracked battery housing
        {
            'sku': 'APP-DYSON-V12',
            'product_name': 'Dyson V12 Detect Slim Cordless Vacuum',
            'category_slug': 'home-appliances',
            'reason': ReturnReason.DEFECTIVE_OR_DAMAGED,
            'desc': 'Dropped during delivery. Motor casing is shattered, battery cracked with sharp edges.',
            'functional': False,
            'packaging': PackagingCondition.DAMAGED_BOX,
            'missing_acc': [],
            'visual_cond': VisualConditionChoice.CRACK_OR_BREAK,
            'confidence': 0.95,
            'defects': [{'defect': 'Crack or Structural Break', 'confidence': 0.95, 'view': 'FRONT', 'notes': 'Cracked battery casing and motor housing'}],
            'rec_action': RecoveryOutcome.RECYCLING,
            'rec_rationale': 'CRITICAL SAFETY CONCERN: Damaged lithium battery casing.\nProduct failed safety evaluation. Routed directly to certified recycling to prevent hazardous reuse.',
            'repair_cost': Decimal('320.00'),
            'resale_val': Decimal('0.00'),
            'status': ReturnStatus.RECYCLED,
            'final_action': RecoveryOutcome.RECYCLING,
            'img_label': 'Dyson V12 Cracked Battery Housing',
        },
        # 5. PENDING MANAGER REVIEW Case: LEGO Star Wars Collector - missing bag 4 & broken piece
        {
            'sku': 'TOY-LEGO-FALCON',
            'product_name': 'LEGO Star Wars Millennium Falcon 75192 Collector',
            'category_slug': 'toys-and-games',
            'reason': ReturnReason.MISSING_PARTS,
            'desc': 'Parts bag #4 is missing from box and one cockpit canopy clip is broken.',
            'functional': False,
            'packaging': PackagingCondition.ORIGINAL_OPENED,
            'missing_acc': ['Parts Bag #4'],
            'visual_cond': VisualConditionChoice.MISSING_OR_BROKEN_PART,
            'confidence': 0.88,
            'defects': [{'defect': 'Missing Component / Part', 'confidence': 0.88, 'view': 'ACCESSORIES', 'notes': 'Bag #4 missing'}],
            'rec_action': RecoveryOutcome.REPAIR,
            'rec_rationale': 'Item missing components. Can be salvaged by ordering replacement parts bag from manufacturer service.',
            'repair_cost': Decimal('45.00'),
            'resale_val': Decimal('600.00'),
            'status': ReturnStatus.AWAITING_MANAGER_APPROVAL,
            'final_action': None,
            'img_label': 'LEGO Box with Missing Bag',
        },
        # 6. PENDING REVIEW Case: La Mer Cream - hygiene seal opened
        {
            'sku': 'BTY-LA-MER-CREAM',
            'product_name': 'Crème de la Mer Moisturizing Cream 60ml',
            'category_slug': 'beauty-and-personal-care-products',
            'reason': ReturnReason.CHANGED_MIND,
            'desc': 'Customer opened foil seal and tested cream with finger.',
            'functional': False,
            'packaging': PackagingCondition.ORIGINAL_OPENED,
            'missing_acc': [],
            'visual_cond': VisualConditionChoice.WATER_DAMAGE,
            'confidence': 0.91,
            'defects': [{'defect': 'Hygiene Seal Broken / Contamination', 'confidence': 0.91, 'view': 'FRONT', 'notes': 'Foil seal peeled'}],
            'rec_action': RecoveryOutcome.RECYCLING,
            'rec_rationale': "Category 'Beauty and personal-care products' is hygiene-sensitive. Unsealed items cannot be restocked or resold under sanitary policy.",
            'repair_cost': Decimal('0.00'),
            'resale_val': Decimal('0.00'),
            'status': ReturnStatus.AWAITING_MANAGER_APPROVAL,
            'final_action': None,
            'img_label': 'La Mer Jar with Opened Foil Seal',
        }
    ]

    for idx, data in enumerate(returns_seed_data):
        cat = ProductCategory.objects.get(slug=data['category_slug'])
        prod = Product.objects.filter(sku=data['sku']).first()

        ret, created = ReturnRequest.objects.get_or_create(
            return_id=f"RET-2026-100{idx+1}",
            defaults={
                'customer': customer_user,
                'product': prod,
                'sku': data['sku'],
                'product_name': data['product_name'],
                'category': cat,
                'return_reason': data['reason'],
                'customer_description': data['desc'],
                'is_functional': data['functional'],
                'packaging_condition': data['packaging'],
                'missing_accessories': data['missing_acc'],
                'status': data['status'],
                'final_recovery_outcome': data['final_action']
            }
        )

        # Create sample image
        img_file_rel = create_sample_image(f"sample_return_{idx+1}.jpg", data['img_label'])
        ReturnImage.objects.get_or_create(
            return_request=ret,
            view_label=ImageViewLabel.FRONT,
            defaults={
                'image': img_file_rel,
                'quality_score': 0.94
            }
        )

        # Create AI inspection
        AIInspection.objects.update_or_create(
            return_request=ret,
            defaults={
                'model_name': 'MobileNetV3-Universal-Defect-v1.2',
                'model_version': '1.2.0',
                'is_category_supported': cat.is_ai_supported,
                'overall_condition': data['visual_cond'],
                'confidence_score': data['confidence'],
                'detected_defects': data['defects'],
                'image_evaluations': [{'view': 'FRONT', 'quality': 0.94, 'score': data['confidence']}],
                'requires_human_inspection': data['confidence'] < 0.80 or not cat.is_ai_supported,
            }
        )

        # Create Recommendation
        RecoveryRecommendation.objects.update_or_create(
            return_request=ret,
            defaults={
                'recommended_action': data['rec_action'],
                'confidence': data['confidence'],
                'rationale': data['rec_rationale'],
                'estimated_repair_cost': data['repair_cost'],
                'estimated_resale_value': data['resale_val'],
                'rules_applied': ['RULE_EVALUATED_AUTOMATIC']
            }
        )

        # If decision already made
        if data['final_action']:
            RecoveryDecision.objects.update_or_create(
                return_request=ret,
                defaults={
                    'manager': manager_user,
                    'final_action': data['final_action'],
                    'is_override': False,
                    'manager_notes': f"Confirmed {data['final_action']} routing per standard protocol."
                }
            )
            InventoryTransaction.objects.get_or_create(
                return_request=ret,
                transaction_type=InventoryTransactionType.RETURN_INTAKE,
                defaults={
                    'sku': data['sku'],
                    'quantity': 1,
                    'location': 'Central Intake Facility',
                    'notes': f'Initial return intake recorded for {data["sku"]}',
                    'performed_by': manager_user
                }
            )

    print(f"[+] Seeded {len(returns_seed_data)} Comprehensive Return Requests across all outcomes.")
    print("========================================")
    print("DATABASE SEEDING COMPLETE!")
    print("========================================")

if __name__ == '__main__':
    run_seed()
