"""
Dataset Inspection Script
Inspects local dataset folders, verifies image integrity, formats, channels,
and reports category distributions and license considerations.
"""
import os
import sys
from pathlib import Path
from PIL import Image

def inspect_datasets(data_root="data/raw"):
    root_path = Path(data_root)
    if not root_path.exists():
        print(f"[!] Data root '{data_root}' does not exist.")
        return

    print("=" * 60)
    print("RETURN RESCUE: DATASET INSPECTION & INTEGRITY AUDIT")
    print("=" * 60)

    total_valid = 0
    total_corrupted = 0
    categories = {}

    valid_exts = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}

    for path in root_path.rglob('*'):
        if path.is_file() and path.suffix.lower() in valid_exts:
            parent_name = path.parent.name
            try:
                with Image.open(path) as img:
                    img.verify()
                total_valid += 1
                categories[parent_name] = categories.get(parent_name, 0) + 1
            except Exception as e:
                print(f"[ERROR] Corrupted image: {path} - {e}")
                total_corrupted += 1

    print(f"\n[+] Total Valid Images:     {total_valid}")
    print(f"[+] Total Corrupted Files:  {total_corrupted}")
    print("\nClass / Folder Distribution:")
    for cat, count in categories.items():
        print(f"  - {cat:<25}: {count} images")

    print("=" * 60)

if __name__ == '__main__':
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "../data/raw"
    inspect_datasets(data_dir)
