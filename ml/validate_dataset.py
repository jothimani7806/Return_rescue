"""
Dataset Validation & Image-Mask Integrity Verifier
Verifies that ground truth masks exist for anomalous test samples and check dimensions.
"""
import os
import sys
import json
from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = Path(__file__).resolve().parent

def validate_dataset(raw_dir=None, report_file=None):
    if raw_dir is None:
        raw_dir = BASE_DIR / "data" / "raw" / "mvtec_ad_2"
    if report_file is None:
        report_file = ML_DIR / "reports" / "dataset_quality_report.json"
    root = Path(raw_dir)
    report_path = Path(report_file)
    print("=" * 60)
    print(f"VALIDATING IMAGE-TO-MASK INTEGRITY: {root.resolve()}")
    print("=" * 60)

    issues = []
    verified_pairs = 0
    total_images_checked = 0

    valid_exts = {'.png', '.jpg', '.jpeg'}

    for cat_dir in root.iterdir():
        if not cat_dir.is_dir() or cat_dir.name.startswith('.'):
            continue

        test_dir = cat_dir / "test"
        gt_dir = cat_dir / "ground_truth"

        if test_dir.exists():
            for defect_dir in test_dir.iterdir():
                if defect_dir.is_dir() and defect_dir.name != "good":
                    gt_defect_dir = gt_dir / defect_dir.name
                    for img_file in defect_dir.iterdir():
                        if img_file.suffix.lower() in valid_exts:
                            total_images_checked += 1
                            # Mask naming pattern in MVTec: <name>_mask.png or same filename
                            expected_mask_1 = gt_defect_dir / f"{img_file.stem}_mask{img_file.suffix}"
                            expected_mask_2 = gt_defect_dir / img_file.name

                            if expected_mask_1.exists():
                                mask_file = expected_mask_1
                            elif expected_mask_2.exists():
                                mask_file = expected_mask_2
                            else:
                                issues.append({
                                    "category": cat_dir.name,
                                    "defect": defect_dir.name,
                                    "file": str(img_file),
                                    "error": "Ground-truth mask file missing"
                                })
                                continue

                            # Check dimensions match
                            try:
                                with Image.open(img_file) as im, Image.open(mask_file) as mk:
                                    if im.size != mk.size:
                                        issues.append({
                                            "file": str(img_file),
                                            "error": f"Dimension mismatch: image {im.size} vs mask {mk.size}"
                                        })
                                    else:
                                        verified_pairs += 1
                            except Exception as e:
                                issues.append({"file": str(img_file), "error": f"Read error: {e}"})

    validation_result = {
        "status": "PASSED" if len(issues) == 0 else "WARNINGS_FOUND",
        "verified_image_mask_pairs": verified_pairs,
        "total_anomalous_images_checked": total_images_checked,
        "issues_count": len(issues),
        "issues": issues
    }

    print(f"[+] Verified Image-Mask Pairs: {verified_pairs}")
    print(f"[+] Total Anomalous Images:    {total_images_checked}")
    print(f"[+] Validation Status:         {validation_result['status']}")
    if issues:
        print(f"[!] Issues Found:              {len(issues)}")

    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(validation_result, f, indent=2)
    print("=" * 60)
    return validation_result

if __name__ == "__main__":
    validate_dataset()
