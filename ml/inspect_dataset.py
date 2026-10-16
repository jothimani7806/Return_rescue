"""
Dataset Inspection Script
Recursively identifies images, masks, dimensions, channels, formats, and category distribution.
"""
import os
import sys
import json
from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = Path(__file__).resolve().parent

def inspect_dataset(raw_dir=None, report_out=None):
    if raw_dir is None:
        raw_dir = BASE_DIR / "data" / "raw" / "mvtec_ad_2"
    if report_out is None:
        report_out = ML_DIR / "reports" / "dataset_quality_report.json"
    root = Path(raw_dir)
    print("=" * 60)
    print(f"INSPECTING DATASET AT: {root.resolve()}")
    print("=" * 60)

    if not root.exists():
        print(f"[!] Directory not found: {raw_dir}")
        return {}

    stats = {
        "categories": {},
        "total_images": 0,
        "total_masks": 0,
        "corrupt_files": 0,
        "formats": {},
        "resolutions": {},
        "defects_found": []
    }

    valid_exts = {'.png', '.jpg', '.jpeg', '.bmp', '.webp', '.tif', '.tiff'}

    for cat_path in root.iterdir():
        if not cat_path.is_dir() or cat_path.name.startswith('.'):
            continue

        cat_name = cat_path.name
        stats["categories"][cat_name] = {
            "train_good": 0,
            "test_good": 0,
            "test_anomalous": 0,
            "ground_truth_masks": 0,
            "defect_types": []
        }

        # Check train normal
        train_good_dir = cat_path / "train" / "good"
        if train_good_dir.exists():
            count = len([f for f in train_good_dir.iterdir() if f.suffix.lower() in valid_exts])
            stats["categories"][cat_name]["train_good"] = count
            stats["total_images"] += count

        # Check test
        test_dir = cat_path / "test"
        if test_dir.exists():
            for sub in test_dir.iterdir():
                if sub.is_dir():
                    count = len([f for f in sub.iterdir() if f.suffix.lower() in valid_exts])
                    if sub.name == "good":
                        stats["categories"][cat_name]["test_good"] = count
                    else:
                        stats["categories"][cat_name]["test_anomalous"] += count
                        stats["categories"][cat_name]["defect_types"].append(sub.name)
                        if sub.name not in stats["defects_found"]:
                            stats["defects_found"].append(sub.name)
                    stats["total_images"] += count

        # Check ground truth masks
        gt_dir = cat_path / "ground_truth"
        if gt_dir.exists():
            for sub in gt_dir.iterdir():
                if sub.is_dir():
                    count = len([f for f in sub.iterdir() if f.suffix.lower() in valid_exts])
                    stats["categories"][cat_name]["ground_truth_masks"] += count
                    stats["total_masks"] += count

    # Sample file checks
    sample_files = list(root.rglob('*.png'))[:50]
    for p in sample_files:
        try:
            with Image.open(p) as img:
                res = f"{img.width}x{img.height}"
                fmt = img.format or "UNKNOWN"
                stats["resolutions"][res] = stats["resolutions"].get(res, 0) + 1
                stats["formats"][fmt] = stats["formats"].get(fmt, 0) + 1
        except Exception:
            stats["corrupt_files"] += 1

    # Save report
    out_file = Path(report_out)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)

    print(f"[+] Total Categories Found: {len(stats['categories'])}")
    print(f"[+] Total Normal Images:    {sum(c['train_good'] + c['test_good'] for c in stats['categories'].values())}")
    print(f"[+] Total Defect Images:    {sum(c['test_anomalous'] for c in stats['categories'].values())}")
    print(f"[+] Total Ground Truth Masks: {stats['total_masks']}")
    print(f"[+] Corrupt Files Detected: {stats['corrupt_files']}")
    print(f"[+] Saved Inspection Report: {out_file.resolve()}")
    print("=" * 60)
    return stats

if __name__ == "__main__":
    inspect_dataset()
